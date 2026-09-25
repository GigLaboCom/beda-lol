//! HTTP router and middleware stack.

pub mod error;
pub mod health;

use std::any::Any;
use std::time::Duration;

use axum::Router;
use axum::body::Body;
use axum::http::{HeaderName, Request, Response, StatusCode};
use axum::routing::get;
use tower::ServiceBuilder;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::request_id::{
    MakeRequestUuid, PropagateRequestIdLayer, RequestId, SetRequestIdLayer,
};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;

use crate::config::Config;
use error::{AppError, error_body};

pub const REQUEST_ID_HEADER: HeaderName = HeaderName::from_static("x-request-id");
pub const BODY_LIMIT: usize = 64 * 1024;
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

/// Routes under `/api`, without middleware.
pub fn routes(_config: &Config) -> Router {
    Router::new()
        .route("/api/healthz", get(health::healthz))
        .route("/api/readyz", get(health::readyz))
        .fallback(|| async { AppError::NotFound })
}

/// Wraps a router in the standard middleware stack, outermost first:
/// request id → trace → propagate request id → body limit → timeout → catch panic.
pub fn with_layers(router: Router) -> Router {
    let trace = TraceLayer::new_for_http()
        .make_span_with(|req: &Request<Body>| {
            let request_id = req
                .extensions()
                .get::<RequestId>()
                .and_then(|id| id.header_value().to_str().ok())
                .unwrap_or("-");
            tracing::info_span!(
                "http",
                method = %req.method(),
                path = %req.uri().path(),
                request_id = %request_id,
            )
        })
        .on_response(DefaultOnResponse::new().level(Level::INFO));

    router.layer(
        ServiceBuilder::new()
            .layer(SetRequestIdLayer::new(REQUEST_ID_HEADER, MakeRequestUuid))
            .layer(trace)
            .layer(PropagateRequestIdLayer::new(REQUEST_ID_HEADER))
            .layer(RequestBodyLimitLayer::new(BODY_LIMIT))
            .layer(TimeoutLayer::with_status_code(
                StatusCode::SERVICE_UNAVAILABLE,
                REQUEST_TIMEOUT,
            ))
            .layer(CatchPanicLayer::custom(panic_response)),
    )
}

#[allow(clippy::needless_pass_by_value)] // signature required by `ResponseForPanic`
fn panic_response(err: Box<dyn Any + Send + 'static>) -> Response<Body> {
    let detail = err
        .downcast_ref::<String>()
        .map(String::as_str)
        .or_else(|| err.downcast_ref::<&str>().copied())
        .unwrap_or("unknown panic");
    tracing::error!(panic = detail, "handler panicked");
    error_body(
        StatusCode::INTERNAL_SERVER_ERROR,
        "internal",
        "internal error",
    )
}
