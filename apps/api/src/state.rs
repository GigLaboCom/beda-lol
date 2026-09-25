//! Shared state handed to every handler.

use crate::http::rate_limit::Limits;
use crate::store::Store;

#[derive(Debug, Clone)]
pub struct AppState {
    pub store: Store,
    pub limits: Limits,
}

impl AppState {
    pub fn new(store: Store) -> Self {
        Self {
            store,
            limits: Limits::new(),
        }
    }
}
