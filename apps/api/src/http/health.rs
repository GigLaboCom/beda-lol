//! Liveness and readiness probes.

use axum::Json;
use axum::extract::State;
use serde_json::{Value, json};

use super::error::AppError;
use crate::state::AppState;

/// `GET /api/healthz` — the process is up.
pub async fn healthz() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// `GET /api/readyz` — the process can serve traffic: the database answers within 2 s.
pub async fn readyz(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    if let Err(err) = state.store.ping().await {
        tracing::warn!(error = %err, "readiness check failed: database");
        return Err(AppError::Unavailable);
    }
    Ok(Json(json!({ "status": "ok" })))
}
