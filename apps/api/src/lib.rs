//! beda.lol API.
#![forbid(unsafe_code)]

pub mod config;
pub mod http;
pub mod telemetry;

use axum::Router;

pub use config::Config;

/// The full application: routes plus middleware.
pub fn app(config: &Config) -> Router {
    http::with_layers(http::routes(config))
}
