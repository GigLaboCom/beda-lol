//! API error type with a stable JSON shape: `{"error":{"code":"…","message":"…"}}`.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found")]
    NotFound,
    #[error("{0}")]
    BadRequest(String),
    #[error("request body is too large")]
    PayloadTooLarge,
    #[error("too many requests")]
    TooManyRequests,
    #[error("service unavailable")]
    Unavailable,
    /// Details are logged, never sent to the client.
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl AppError {
    pub fn status(&self) -> StatusCode {
        match self {
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::TooManyRequests => StatusCode::TOO_MANY_REQUESTS,
            Self::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            Self::NotFound => "not_found",
            Self::BadRequest(_) => "bad_request",
            Self::PayloadTooLarge => "payload_too_large",
            Self::TooManyRequests => "too_many_requests",
            Self::Unavailable => "unavailable",
            Self::Internal(_) => "internal",
        }
    }
}

/// Builds the error body used by every non-2xx response.
pub fn error_body(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(json!({ "error": { "code": code, "message": message } })),
    )
        .into_response()
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let message = match &self {
            Self::Internal(err) => {
                tracing::error!(error = ?err, "internal error");
                "internal error".to_owned()
            }
            other => other.to_string(),
        };
        error_body(self.status(), self.code(), &message)
    }
}
