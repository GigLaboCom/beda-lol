//! `POST /api/events` — allow-listed product events.
//!
//! The event name is a serde enum: anything not listed fails to deserialize.
//! Props are typed per event, so free text (e.g. the name typed into the
//! name game) cannot be stored.

use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};

use super::error::AppError;
use super::json::JsonBody;
use crate::state::AppState;
use crate::store::events::insert_event;

#[derive(Debug, Deserialize)]
#[serde(
    tag = "name",
    content = "props",
    rename_all = "snake_case",
    deny_unknown_fields
)]
pub enum Event {
    /// The name game was played; `found` = a funny word came out.
    NamerPlayed(NamerPlayed),
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct NamerPlayed {
    found: bool,
}

impl Event {
    fn name(&self) -> &'static str {
        match self {
            Self::NamerPlayed(_) => "namer_played",
        }
    }

    fn props(&self) -> Result<serde_json::Value, serde_json::Error> {
        match self {
            Self::NamerPlayed(p) => serde_json::to_value(p),
        }
    }
}

pub async fn create_event(
    State(state): State<AppState>,
    JsonBody(event): JsonBody<Event>,
) -> Result<StatusCode, AppError> {
    let props = event
        .props()
        .map_err(|err| AppError::Internal(err.into()))?;
    insert_event(state.store.pool(), event.name(), &props)
        .await
        .map_err(|err| AppError::Internal(err.into()))?;
    Ok(StatusCode::NO_CONTENT)
}
