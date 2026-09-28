//! `GET /api/me` — the user behind the token and the account the request acts in.

use axum::Json;
use axum::http::header::CACHE_CONTROL;
use axum::response::IntoResponse;
use serde::Serialize;
use uuid::Uuid;

use crate::auth::{CurrentUser, Membership, Role};

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
