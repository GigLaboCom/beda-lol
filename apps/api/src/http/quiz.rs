//! `POST /api/quiz/attempts` — anonymous record of a completed inspection.

use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;

use super::error::AppError;
use super::json::JsonBody;
use crate::domain::result_code;
use crate::state::AppState;
use crate::store::quiz::{NewQuizAttempt, insert_quiz_attempt};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AttemptRequest {
    code: String,
    #[serde(default)]
    source: Option<String>,
}

/// Where the visitor came from: short lowercase slug, or nothing.
fn valid_source(source: &str) -> bool {
    (1..=32).contains(&source.len())
        && source
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
}

pub async fn create_attempt(
    State(state): State<AppState>,
    JsonBody(body): JsonBody<AttemptRequest>,
) -> Result<StatusCode, AppError> {
    let states = result_code::parse(&body.code)
        .ok_or_else(|| AppError::BadRequest("code must be six digits 0–2".to_owned()))?;
    let source = match body.source.as_deref() {
        None | Some("") => None,
        Some(s) if valid_source(s) => Some(s),
        Some(_) => return Err(AppError::BadRequest("invalid source".to_owned())),
    };

    let attempt = NewQuizAttempt {
        scores: states.map(i16::from),
        class: Some(result_code::classify(&states)),
        source,
    };
    insert_quiz_attempt(state.store.pool(), &attempt)
        .await
        .map_err(|err| AppError::Internal(err.into()))?;
    Ok(StatusCode::NO_CONTENT)
}
