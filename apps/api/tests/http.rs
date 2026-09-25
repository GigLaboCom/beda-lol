#![allow(clippy::unwrap_used)]

use axum::Router;
use axum::body::{Body, Bytes};
use axum::http::{Request, StatusCode};
use axum::routing::{get, post};
use beda_api::{Config, app, http};
use http_body_util::BodyExt as _;
use serde_json::Value;
use tower::ServiceExt as _;

async fn json_body(res: axum::response::Response) -> Value {
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn healthz_is_ok() {
    let res = app(&Config::default())
        .oneshot(Request::get("/api/healthz").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(json_body(res).await, serde_json::json!({ "status": "ok" }));
}

#[tokio::test]
async fn request_id_is_generated_when_absent() {
    let res = app(&Config::default())
        .oneshot(Request::get("/api/healthz").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let id = res
        .headers()
        .get("x-request-id")
        .expect("request id header");
    assert_eq!(id.to_str().unwrap().len(), 36, "uuid expected");
}

#[tokio::test]
async fn request_id_is_echoed_when_present() {
    let res = app(&Config::default())
        .oneshot(
            Request::get("/api/healthz")
                .header("x-request-id", "abc-123")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.headers()["x-request-id"], "abc-123");
}

#[tokio::test]
async fn unknown_route_uses_error_shape() {
    let res = app(&Config::default())
        .oneshot(Request::get("/api/nope").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
    assert_eq!(json_body(res).await["error"]["code"], "not_found");
}

fn test_router() -> Router {
    http::with_layers(
        Router::new()
            .route(
                "/api/echo",
                post(|body: Bytes| async move { body.len().to_string() }),
            )
            .route(
                "/api/panic",
                get(|| async {
                    panic!("boom");
                    #[allow(unreachable_code)]
                    ""
                }),
            ),
    )
}

#[tokio::test]
async fn body_over_64_kib_is_rejected() {
    let big = vec![b'x'; http::BODY_LIMIT + 1];
    let res = test_router()
        .oneshot(Request::post("/api/echo").body(Body::from(big)).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::PAYLOAD_TOO_LARGE);

    let ok = vec![b'x'; http::BODY_LIMIT];
    let res = test_router()
        .oneshot(Request::post("/api/echo").body(Body::from(ok)).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn panic_becomes_500_with_error_shape() {
    let res = test_router()
        .oneshot(Request::get("/api/panic").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let body = json_body(res).await;
    assert_eq!(body["error"]["code"], "internal");
    assert_eq!(body["error"]["message"], "internal error");
}
