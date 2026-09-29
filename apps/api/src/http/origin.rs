//! Origin check on unsafe methods (amendment П-1, rule 3).
//!
//! The bearer token is sent by our own code, not by the browser, so classic
//! CSRF does not apply; this is the extra line the amendment keeps. A request
//! with a foreign `Origin` (or `Origin: null`) is refused. Requests without the
//! header come from non-browser clients (browsers always send it on unsafe
//! cross-origin requests) and pass.

use std::sync::Arc;

use axum::extract::Request;
use axum::http::Method;
use axum::http::header::ORIGIN;
use axum::middleware::Next;
use axum::response::Response;

use super::error::AppError;

pub async fn enforce(
    allowed: Arc<[String]>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let unsafe_method = !matches!(
        *request.method(),
        Method::GET | Method::HEAD | Method::OPTIONS
    );
    if unsafe_method && let Some(origin) = request.headers().get(ORIGIN) {
        let ok = origin
            .to_str()
            .is_ok_and(|o| allowed.iter().any(|a| a.eq_ignore_ascii_case(o)));
        if !ok {
            tracing::info!(origin = ?origin, "unsafe request from a foreign origin refused");
            return Err(AppError::Forbidden("foreign origin".to_owned()));
        }
    }
    Ok(next.run(request).await)
}
