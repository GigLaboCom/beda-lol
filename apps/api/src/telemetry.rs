//! Logging setup: JSON lines in prod, human-readable output in dev.

use tracing_subscriber::EnvFilter;

use crate::config::Config;

/// Installs the global tracing subscriber. Call once at startup.
pub fn init(config: &Config) {
    let filter = EnvFilter::try_new(&config.log).unwrap_or_else(|_| EnvFilter::new("info"));
    let builder = tracing_subscriber::fmt().with_env_filter(filter);
    if config.env.is_prod() {
        builder
            .json()
            .flatten_event(true)
            .with_current_span(false)
            .init();
    } else {
        builder.compact().init();
    }
}
