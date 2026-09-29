//! `app.users`, `app.accounts`, `app.account_members` — who a token belongs to.

use sqlx::PgExecutor;
use uuid::Uuid;

/// A row of `app.users`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UserRow {
    pub id: Uuid,
    pub display_name: String,
    pub role: String,
    pub trusted: bool,
    pub status: String,
}

/// One account the user belongs to, with the user's role in it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MembershipRow {
    pub account_id: Uuid,
    pub kind: String,
    pub name: String,
    pub role: String,
}

pub async fn find_user(db: impl PgExecutor<'_>, id: Uuid) -> Result<Option<UserRow>, sqlx::Error> {
    sqlx::query_as!(
        UserRow,
        "select id, display_name, role, trusted, status from app.users where id = $1",
        id,
    )
    .fetch_optional(db)
    .await
}

/// The user's accounts, the default one (lowest priority, then oldest) first.
pub async fn memberships(
    db: impl PgExecutor<'_>,
    user_id: Uuid,
) -> Result<Vec<MembershipRow>, sqlx::Error> {
    sqlx::query_as!(
        MembershipRow,
        "select a.id as account_id, a.kind, a.name, m.role
         from app.account_members m
         join app.accounts a on a.id = m.account_id
         where m.user_id = $1
         order by m.priority, m.created_at, a.id",
        user_id,
    )
    .fetch_all(db)
    .await
}

/// Sets the site role of the user who signed in with GitHub login `login`.
/// Returns the user id, or `None` when no such user exists.
pub async fn set_role_by_github_login(
    db: impl PgExecutor<'_>,
    login: &str,
    role: &str,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar!(
        "update app.users set role = $2
         where id = app.user_id_by_github_login($1)
         returning id",
        login,
        role,
    )
    .fetch_optional(db)
    .await
}
