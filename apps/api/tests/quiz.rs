//! `POST /api/quiz/attempts`: validation and rate limit (no database needed),
//! plus one end-to-end insert when `BEDA_TEST_DATABASE_URL` is set.
#![allow(clippy::unwrap_used)]

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use beda_api::{AppState, Config, Store, app};
use http_body_util::BodyExt as _;
use serde_json::Value;
use tower::ServiceExt as _;

fn app_with(url: &str) -> Router {
    let store = Store::connect_lazy(url, 2).unwrap();
    app(&Config::default(), AppState::new(store))
}

fn offline_app() -> Router {
    app_with("postgres://nobody@127.0.0.1:1/none")
}

fn post(body: &str, ip: &str) -> Request<Body> {
    Request::post("/api/quiz/attempts")
        .header("content-type", "application/json")
        .header("x-forwarded-for", ip)
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn error_code(res: axum::response::Response) -> String {
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let v: Value = serde_json::from_slice(&bytes).unwrap();
    v["error"]["code"].as_str().unwrap().to_owned()
}

#[tokio::test]
async fn rejects_invalid_codes() {
    let app = offline_app();
    for body in [
        r#"{"code":"00221"}"#,
        r#"{"code":"003212"}"#,
        r#"{"code":"abcdef"}"#,
        r#"{"code":"002212","source":"Not A Slug!"}"#,
    ] {
        let res = app.clone().oneshot(post(body, "10.0.0.1")).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST, "{body}");
        assert_eq!(error_code(res).await, "bad_request");
    }
}

#[tokio::test]
async fn rejects_unknown_fields_and_bad_json() {
    let app = offline_app();
    for body in [
        r#"{"code":"002212","name":"secret"}"#,
        "{",
        r#"{"source":"x"}"#,
    ] {
        let res = app.clone().oneshot(post(body, "10.0.0.2")).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST, "{body}");
    }
    let res = app
        .oneshot(
            Request::post("/api/quiz/attempts")
                .header("content-type", "text/plain")
                .body(Body::from(r#"{"code":"002212"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn rate_limits_ten_per_minute_per_ip() {
    let app = offline_app();
    for _ in 0..10 {
        let res = app
            .clone()
            .oneshot(post(r#"{"code":"x"}"#, "10.0.0.3"))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }
    let res = app
        .clone()
        .oneshot(post(r#"{"code":"x"}"#, "10.0.0.3"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(error_code(res).await, "too_many_requests");

    // Another client is not affected; the last X-Forwarded-For entry counts.
    let res = app
        .oneshot(post(r#"{"code":"x"}"#, "10.0.0.3, 10.0.0.4"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn records_an_attempt() {
    let Some(url) = std::env::var("BEDA_TEST_DATABASE_URL")
        .ok()
        .filter(|v| !v.is_empty())
    else {
        eprintln!("BEDA_TEST_DATABASE_URL not set, skipping database test");
        return;
    };
    let source = format!("test-{}", uuid::Uuid::new_v4().simple());
    let body = format!(r#"{{"code":"002212","source":"{}"}}"#, &source[..32]);
    let res = app_with(&url)
        .oneshot(post(&body, "10.0.0.5"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    let pool = sqlx::PgPool::connect(&url).await.unwrap();
    let (scores, class): (Vec<i16>, Option<String>) =
        sqlx::query_as("delete from app.quiz_attempts where source = $1 returning scores, class")
            .bind(&source[..32])
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(scores, vec![0, 0, 2, 2, 1, 2]);
    assert_eq!(class.as_deref(), Some("beda-po"));
}
