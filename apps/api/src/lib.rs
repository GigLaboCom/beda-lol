//! beda.lol API.
#![forbid(unsafe_code)]

pub mod config;
pub mod domain;
pub mod http;
pub mod state;
pub mod store;
pub mod telemetry;

use axum::Router;
pub use config::Config;
pub use state::AppState;
pub use store::Store;

/// The full application: routes plus middleware.
pub fn app(config: &Config, state: AppState) -> Router {
    http::with_layers(http::routes(config, state))
}
