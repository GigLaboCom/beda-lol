//! `POST /api/events`: only allow-listed events with typed props.
#![allow(clippy::unwrap_used)]

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use beda_api::{AppState, Config, Store, app};
use tower::ServiceExt as _;

fn app_with(url: &str) -> Router {
    app(
        &Config::default(),
        AppState::new(Store::connect_lazy(url, 2).unwrap()),
    )
}

fn post(body: &str, ip: &str) -> Request<Body> {
    Request::post("/api/events")
        .header("content-type", "application/json")
        .header("x-forwarded-for", ip)
        .body(Body::from(body.to_owned()))
        .unwrap()
}

#[tokio::test]
async fn rejects_unknown_events_and_extra_props() {
    let app = app_with("postgres://nobody@127.0.0.1:1/none");
    for body in [
        r#"{"name":"page_view","props":{}}"#,
        r#"{"name":"namer_played","props":{"found":true,"name":"БАГТРЕКЕР"}}"#,
        r#"{"name":"namer_played","props":{"found":"yes"}}"#,
        r#"{"name":"namer_played","props":{"found":true},"extra":1}"#,
        r#"{"name":"namer_played"}"#,
    ] {
        let res = app.clone().oneshot(post(body, "10.1.0.1")).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST, "{body}");
    }
}

#[tokio::test]
async fn rate_limits_per_ip() {
    let app = app_with("postgres://nobody@127.0.0.1:1/none");
    for _ in 0..10 {
        let res = app.clone().oneshot(post("{}", "10.1.0.2")).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }
    let res = app
        .oneshot(post(
            r#"{"name":"namer_played","props":{"found":true}}"#,
            "10.1.0.2",
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn records_namer_played() {
    let Some(url) = std::env::var("BEDA_TEST_DATABASE_URL")
        .ok()
        .filter(|v| !v.is_empty())
    else {
        eprintln!("BEDA_TEST_DATABASE_URL not set, skipping database test");
        return;
    };
    let pool = sqlx::PgPool::connect(&url).await.unwrap();
    let before: i64 = sqlx::query_scalar("select coalesce(max(id), 0) from app.events")
        .fetch_one(&pool)
        .await
        .unwrap();
    let res = app_with(&url)
        .oneshot(post(
            r#"{"name":"namer_played","props":{"found":false}}"#,
            "10.1.0.3",
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);
    let (name, props): (String, serde_json::Value) = sqlx::query_as(
        "delete from app.events where id > $1 and name = 'namer_played' returning name, props",
    )
    .bind(before)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(name, "namer_played");
    assert_eq!(props, serde_json::json!({ "found": false }));
}
