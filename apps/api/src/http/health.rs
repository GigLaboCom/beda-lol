//! Liveness and readiness probes.

use axum::Json;
use serde_json::{Value, json};

/// `GET /api/healthz` — the process is up.
pub async fn healthz() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// `GET /api/readyz` — the process can serve traffic (database check arrives in S02).
pub async fn readyz() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
