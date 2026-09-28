//! Shared state handed to every handler.

use std::sync::Arc;

use crate::auth::{UserCache, Verifier};
use crate::http::rate_limit::Limits;
use crate::store::Store;

#[derive(Debug, Clone)]
pub struct AppState {
    pub store: Store,
    pub limits: Limits,
    /// `None` when `BEDA_SUPABASE_URL` is unset: routes that need a user answer 503.
    pub auth: Option<Arc<Verifier>>,
    pub users: UserCache,
}

impl AppState {
    pub fn new(store: Store) -> Self {
        Self {
            store,
            limits: Limits::new(),
            auth: None,
            users: UserCache::default(),
        }
    }

    #[must_use]
    pub fn with_auth(mut self, verifier: Verifier) -> Self {
        self.auth = Some(Arc::new(verifier));
        self
    }

    /// Periodic cleanup of the in-memory maps.
    pub fn housekeeping(&self) {
        self.limits.housekeeping();
        self.users.housekeeping();
    }
}
