//! The user behind a request, available to every handler as an extractor.
//!
//! `CurrentUser` = bearer token verified → `app.users` row (cached for
//! [`USER_TTL`]) → the account the request acts in. Handlers take tenant data
//! by `user.account.id`, never by an id from the body. The account is the one
//! named by the [`ACCOUNT_HEADER`] header when the user is a member of it, else
//! the default one (the personal account).
//!
//! `Option<CurrentUser>` is for routes that also serve guests: no
//! `Authorization` header gives `None`, a bad token is still a 401.

use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use axum::extract::{FromRequestParts, OptionalFromRequestParts};
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use axum::http::{HeaderName, HeaderValue};
use uuid::Uuid;

use super::token::TokenError;
use crate::http::error::AppError;
use crate::state::AppState;
use crate::store::users::{MembershipRow, UserRow, find_user, memberships};

pub const ACCOUNT_HEADER: HeaderName = HeaderName::from_static("x-beda-account");
/// How long a loaded user is reused (amendment П-1: 60 s).
pub const USER_TTL: Duration = Duration::from_secs(60);
/// Above this many cached users, expired entries are dropped on insert.
pub const USER_CACHE_CAP: usize = 10_000;

/// Site-wide role, from `app.users.role`. Ordered: a higher role can do what a
/// lower one can.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    User,
    Moderator,
    Admin,
}

/// The user's role inside one account.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountRole {
    Owner,
    Member,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountKind {
    Personal,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Membership {
    pub id: Uuid,
    pub kind: AccountKind,
    pub name: String,
    pub role: AccountRole,
}

/// A user as loaded from the database, shared through the cache.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct User {
    pub id: Uuid,
    pub display_name: String,
    pub role: Role,
    pub trusted: bool,
    pub blocked: bool,
    /// Default account first.
    pub accounts: Vec<Membership>,
}

/// The authenticated user of this request and the account it acts in.
#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub user: Arc<User>,
    pub account: Membership,
}

impl CurrentUser {
    pub fn id(&self) -> Uuid {
        self.user.id
    }

    /// 403 unless the user's site role is at least `min`.
    pub fn require_role(&self, min: Role) -> Result<(), AppError> {
        if self.user.role >= min {
            Ok(())
        } else {
            Err(AppError::Forbidden("insufficient role".to_owned()))
        }
    }

    /// 403 unless the user owns the current account.
    pub fn require_account_owner(&self) -> Result<(), AppError> {
        if self.account.role == AccountRole::Owner {
            Ok(())
        } else {
            Err(AppError::Forbidden("account owner only".to_owned()))
        }
    }
}

impl FromStr for Role {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "user" => Ok(Self::User),
            "moderator" => Ok(Self::Moderator),
            "admin" => Ok(Self::Admin),
            other => Err(format!("unknown user role `{other}`")),
        }
    }
}

impl FromStr for AccountRole {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "owner" => Ok(Self::Owner),
            "member" => Ok(Self::Member),
            other => Err(format!("unknown account role `{other}`")),
        }
    }
}

impl FromStr for AccountKind {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "personal" => Ok(Self::Personal),
            other => Err(format!("unknown account kind `{other}`")),
        }
    }
}

impl User {
    /// Builds the user from its rows; a value the enums do not know is an error.
    pub fn from_rows(row: UserRow, accounts: Vec<MembershipRow>) -> Result<Self, String> {
        let accounts = accounts
            .into_iter()
            .map(|m| {
                Ok(Membership {
                    id: m.account_id,
                    kind: m.kind.parse()?,
                    name: m.name,
                    role: m.role.parse()?,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok(Self {
            id: row.id,
            display_name: row.display_name,
            role: row.role.parse()?,
            trusted: row.trusted,
            blocked: match row.status.as_str() {
                "active" => false,
                "blocked" => true,
                other => return Err(format!("unknown user status `{other}`")),
            },
            accounts,
        })
    }

    /// The account named by `requested`, or the default one.
    pub fn pick_account(&self, requested: Option<Uuid>) -> Result<&Membership, AppError> {
        match requested {
            Some(id) => self
                .accounts
                .iter()
                .find(|m| m.id == id)
                .ok_or_else(|| AppError::Forbidden("not a member of this account".to_owned())),
            None => self
                .accounts
                .first()
                .ok_or_else(|| AppError::Forbidden("user has no account".to_owned())),
        }
    }
}

type Entries = HashMap<Uuid, (Instant, Arc<User>)>;

/// Users loaded in the last [`USER_TTL`], by id.
#[derive(Debug, Clone, Default)]
pub struct UserCache {
    inner: Arc<Mutex<Entries>>,
}

impl UserCache {
    pub fn get(&self, id: Uuid) -> Option<Arc<User>> {
        let map = self.inner.lock().ok()?;
        map.get(&id)
            .filter(|(at, _)| at.elapsed() < USER_TTL)
            .map(|(_, user)| user.clone())
    }

    pub fn put(&self, user: Arc<User>) {
        if let Ok(mut map) = self.inner.lock() {
            if map.len() >= USER_CACHE_CAP {
                map.retain(|_, (at, _)| at.elapsed() < USER_TTL);
            }
            if map.len() < USER_CACHE_CAP {
                map.insert(user.id, (Instant::now(), user));
            }
        }
    }

    /// Forgets a user, e.g. after their role or accounts changed.
    pub fn invalidate(&self, id: Uuid) {
        if let Ok(mut map) = self.inner.lock() {
            map.remove(&id);
        }
    }

    /// Drops expired entries. Call periodically.
    pub fn housekeeping(&self) {
        if let Ok(mut map) = self.inner.lock() {
            map.retain(|_, (at, _)| at.elapsed() < USER_TTL);
        }
    }
}

/// The token from `Authorization: Bearer <token>`; `None` without the header.
fn bearer(parts: &Parts) -> Result<Option<&str>, AppError> {
    let Some(value) = parts.headers.get(AUTHORIZATION) else {
        return Ok(None);
    };
    let value = value.to_str().map_err(|_| AppError::Unauthorized)?;
    let (scheme, token) = value.split_once(' ').ok_or(AppError::Unauthorized)?;
    let token = token.trim();
    if !scheme.eq_ignore_ascii_case("bearer") || token.is_empty() {
        return Err(AppError::Unauthorized);
    }
    Ok(Some(token))
}

fn requested_account(value: Option<&HeaderValue>) -> Result<Option<Uuid>, AppError> {
    value
        .map(|v| {
            v.to_str()
                .ok()
                .and_then(|s| Uuid::parse_str(s.trim()).ok())
                .ok_or_else(|| AppError::BadRequest(format!("{ACCOUNT_HEADER} must be a UUID")))
        })
        .transpose()
}

async fn load(state: &AppState, id: Uuid) -> Result<Option<Arc<User>>, AppError> {
    if let Some(user) = state.users.get(id) {
        return Ok(Some(user));
    }
    let pool = state.store.pool();
    let Some(row) = find_user(pool, id)
        .await
        .map_err(|e| AppError::Internal(e.into()))?
    else {
        return Ok(None);
    };
    let accounts = memberships(pool, id)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    let user = Arc::new(
        User::from_rows(row, accounts).map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?,
    );
    state.users.put(user.clone());
    Ok(Some(user))
}

async fn resolve(parts: &Parts, state: &AppState, token: &str) -> Result<CurrentUser, AppError> {
    let Some(verifier) = state.auth.as_deref() else {
        tracing::warn!("a bearer token arrived but auth is not configured (BEDA_SUPABASE_URL)");
        return Err(AppError::Unavailable);
    };
    let claims = verifier.verify(token).await.map_err(|err| match err {
        TokenError::KeysUnavailable(_) => {
            tracing::warn!(error = %err, "token not checked");
            AppError::Unavailable
        }
        other => {
            tracing::debug!(error = %other, "token rejected");
            AppError::Unauthorized
        }
    })?;
    let Some(user) = load(state, claims.sub).await? else {
        tracing::warn!(user_id = %claims.sub, "valid token for a user without an app.users row");
        return Err(AppError::Unauthorized);
    };
    if user.blocked {
        return Err(AppError::Forbidden("account blocked".to_owned()));
    }
    let requested = requested_account(parts.headers.get(ACCOUNT_HEADER))?;
    let account = user.pick_account(requested)?.clone();
    Ok(CurrentUser { user, account })
}

impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = bearer(parts)?.ok_or(AppError::Unauthorized)?;
        resolve(parts, state, token).await
    }
}

impl OptionalFromRequestParts<AppState> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Option<Self>, Self::Rejection> {
        match bearer(parts)? {
            None => Ok(None),
            Some(token) => resolve(parts, state, token).await.map(Some),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn user(accounts: Vec<Membership>) -> User {
        User {
            id: Uuid::nil(),
            display_name: String::new(),
            role: Role::Moderator,
            trusted: false,
            blocked: false,
            accounts,
        }
    }

    fn membership(n: u128, role: AccountRole) -> Membership {
        Membership {
            id: Uuid::from_u128(n),
            kind: AccountKind::Personal,
            name: String::new(),
            role,
        }
    }

    #[test]
    fn default_account_is_the_first() {
        let u = user(vec![
            membership(1, AccountRole::Owner),
            membership(2, AccountRole::Member),
        ]);
        assert_eq!(u.pick_account(None).unwrap().id, Uuid::from_u128(1));
        assert_eq!(
            u.pick_account(Some(Uuid::from_u128(2))).unwrap().id,
            Uuid::from_u128(2)
        );
    }

    #[test]
    fn foreign_account_is_forbidden() {
        let u = user(vec![membership(1, AccountRole::Owner)]);
        let err = u.pick_account(Some(Uuid::from_u128(9))).unwrap_err();
        assert!(matches!(err, AppError::Forbidden(_)));
        assert!(matches!(
            user(vec![]).pick_account(None),
            Err(AppError::Forbidden(_))
        ));
    }

    #[test]
    fn roles_are_ordered() {
        let current = CurrentUser {
            user: Arc::new(user(vec![membership(1, AccountRole::Member)])),
            account: membership(1, AccountRole::Member),
        };
        assert!(current.require_role(Role::User).is_ok());
        assert!(current.require_role(Role::Moderator).is_ok());
        assert!(current.require_role(Role::Admin).is_err());
        assert!(current.require_account_owner().is_err());
    }

    #[test]
    fn rows_with_unknown_values_fail() {
        let row = UserRow {
            id: Uuid::nil(),
            display_name: "a".to_owned(),
            role: "captain".to_owned(),
            trusted: false,
            status: "active".to_owned(),
        };
        assert!(User::from_rows(row, vec![]).is_err());
    }

    #[test]
    fn cache_returns_fresh_users_and_forgets() {
        let cache = UserCache::default();
        let u = Arc::new(user(vec![]));
        cache.put(u.clone());
        assert_eq!(cache.get(u.id).as_deref(), Some(&*u));
        cache.invalidate(u.id);
        assert!(cache.get(u.id).is_none());
    }

    #[test]
    fn bearer_header_parsing() {
        let parts = |v: Option<&str>| {
            let mut req = axum::http::Request::builder();
            if let Some(v) = v {
                req = req.header(AUTHORIZATION, v);
            }
            req.body(()).unwrap().into_parts().0
        };
        assert_eq!(bearer(&parts(None)).unwrap(), None);
        assert_eq!(bearer(&parts(Some("Bearer abc"))).unwrap(), Some("abc"));
        assert_eq!(bearer(&parts(Some("bearer  abc "))).unwrap(), Some("abc"));
        assert!(bearer(&parts(Some("Basic abc"))).is_err());
        assert!(bearer(&parts(Some("Bearer "))).is_err());
        assert!(bearer(&parts(Some("abc"))).is_err());
    }

    #[test]
    fn account_header_must_be_a_uuid() {
        assert_eq!(requested_account(None).unwrap(), None);
        let id = Uuid::from_u128(7);
        let value = HeaderValue::from_str(&id.to_string()).unwrap();
        assert_eq!(requested_account(Some(&value)).unwrap(), Some(id));
        let bad = HeaderValue::from_static("nope");
        assert!(matches!(
            requested_account(Some(&bad)),
            Err(AppError::BadRequest(_))
        ));
    }
}
