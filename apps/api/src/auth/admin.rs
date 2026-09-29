//! Supabase Auth Admin API, called with the project's secret key (amendment
//! П-1, rule 5: the key lives only in the API's server `.env`). Used to delete
//! an account; nothing else on the site needs admin rights.

use std::fmt;
use std::time::Duration;

use uuid::Uuid;

pub const ADMIN_TIMEOUT: Duration = Duration::from_secs(10);

/// A secret that never shows up in `Debug` output or logs.
#[derive(Clone, PartialEq, Eq)]
pub struct Secret(String);

impl Secret {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for Secret {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Secret(***)")
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AdminError {
    #[error("auth admin request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("auth admin answered {0}")]
    Status(reqwest::StatusCode),
}

/// Client for `{supabase_url}/auth/v1/admin/*`.
pub struct AuthAdmin {
    http: reqwest::Client,
    base: String,
    key: Secret,
}

impl fmt::Debug for AuthAdmin {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("AuthAdmin")
            .field("base", &self.base)
            .finish_non_exhaustive()
    }
}

impl AuthAdmin {
    /// `supabase_url` without a trailing slash, e.g. `https://<ref>.supabase.co`.
    pub fn new(supabase_url: &str, key: Secret) -> Result<Self, reqwest::Error> {
        let http = reqwest::Client::builder()
            .timeout(ADMIN_TIMEOUT)
            .user_agent(concat!("beda-api/", env!("CARGO_PKG_VERSION")))
            .build()?;
        Ok(Self {
            http,
            base: format!("{supabase_url}/auth/v1/admin"),
            key,
        })
    }

    /// Deletes the `auth.users` row, which drops the user's sessions and
    /// identities and cascades to `app.users`. A user that is already gone
    /// counts as deleted, so a retry after a partial failure succeeds.
    pub async fn delete_user(&self, id: Uuid) -> Result<(), AdminError> {
        let res = self
            .http
            .delete(format!("{}/users/{id}", self.base))
            // The secret key goes in `apikey` alone; the gateway turns it into a
            // service-role token (it is not a JWT itself).
            .header("apikey", self.key.expose())
            .send()
            .await?;
        match res.status() {
            s if s.is_success() || s == reqwest::StatusCode::NOT_FOUND => Ok(()),
            s => Err(AdminError::Status(s)),
        }
    }
}
