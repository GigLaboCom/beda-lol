//! `GET /api/me` — the user behind the token and the account the request acts in.
//! `DELETE /api/me` — deletes the account (the cabinet's «Удалить аккаунт»).

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::http::header::CACHE_CONTROL;
use axum::response::IntoResponse;
use serde::Serialize;
use uuid::Uuid;

use super::error::AppError;
use crate::auth::{CurrentUser, Membership, Role};
use crate::state::AppState;
use crate::store::users::anonymise_user;

#[derive(Debug, Serialize)]
pub struct Me<'a> {
    pub id: Uuid,
    pub display_name: &'a str,
    pub role: Role,
    pub trusted: bool,
    pub account: &'a Membership,
    pub accounts: &'a [Membership],
}

pub async fn me(user: CurrentUser) -> impl IntoResponse {
    let body = Me {
        id: user.user.id,
        display_name: &user.user.display_name,
        role: user.user.role,
        trusted: user.user.trusted,
        account: &user.account,
        accounts: &user.user.accounts,
    };
    (
        [(CACHE_CONTROL, "no-store")],
        Json(serde_json::to_value(&body).unwrap_or_default()),
    )
}

/// Anonymises what the user wrote, then deletes the user through the Admin API
/// (amendment П-1, rule 6). The order matters: if the Admin call fails, the
/// records are already detached and a retry finishes the job. Deleting the
/// `auth.users` row ends every session; tokens already issued stop working here
/// at once, because the user row is gone and the cache entry is dropped.
pub async fn delete_me(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<StatusCode, AppError> {
    let Some(admin) = state.admin.as_deref() else {
        tracing::warn!("account deletion asked for, but BEDA_SUPABASE_SECRET_KEY is not set");
        return Err(AppError::Unavailable);
    };
    let id = user.id();
    let mut tx = state
        .store
        .pool()
        .begin()
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    let detached = anonymise_user(&mut tx, id)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    admin
        .delete_user(id)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    state.users.invalidate(id);
    tracing::info!(user_id = %id, detached, "account deleted");
    Ok(StatusCode::NO_CONTENT)
}
