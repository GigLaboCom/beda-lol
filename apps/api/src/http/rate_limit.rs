//! In-memory rate limits keyed by client IP (one API instance, see the spec).

use std::net::IpAddr;
use std::num::NonZeroU32;
use std::sync::Arc;

use governor::{DefaultKeyedRateLimiter, Quota};

/// Limiters for the write endpoints.
#[derive(Debug, Clone)]
pub struct Limits {
    pub quiz_attempts: Arc<DefaultKeyedRateLimiter<IpAddr>>,
    pub events: Arc<DefaultKeyedRateLimiter<IpAddr>>,
}

impl Limits {
    /// 10 requests per minute per IP for each endpoint.
    pub fn new() -> Self {
        let per_minute = Quota::per_minute(NonZeroU32::MIN.saturating_add(9));
        Self {
            quiz_attempts: Arc::new(DefaultKeyedRateLimiter::keyed(per_minute)),
            events: Arc::new(DefaultKeyedRateLimiter::keyed(per_minute)),
        }
    }

    /// Drops idle keys so the maps do not grow forever. Call periodically.
    pub fn housekeeping(&self) {
        self.quiz_attempts.retain_recent();
        self.events.retain_recent();
    }
}

impl Default for Limits {
    fn default() -> Self {
        Self::new()
    }
}

/// Middleware: rejects with 429 before the body is read, so malformed
/// requests count against the limit too.
pub async fn enforce(
    limiter: Arc<DefaultKeyedRateLimiter<IpAddr>>,
    client: super::client_ip::ClientIp,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Result<axum::response::Response, super::error::AppError> {
    if limiter.check_key(&client.0).is_err() {
        return Err(super::error::AppError::TooManyRequests);
    }
    Ok(next.run(request).await)
}
