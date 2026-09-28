//! Supabase access tokens, verified locally against the project's JWKS.
//!
//! Checks: signature by a key from the JWKS (ES256 or RS256, the key's own
//! algorithm must match the header), `iss`, `aud = authenticated`, `exp`, and a
//! UUID `sub`. Anonymous Supabase sessions are rejected.
//!
//! Keys are cached for [`KEYS_TTL`]. A token with an unknown `kid` refetches
//! the set (key rotation), at most once per [`MIN_REFETCH`], so random `kid`s
//! cannot turn into a request flood against Supabase. When a refetch fails, the
//! cached keys keep working.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use jsonwebtoken::jwk::{AlgorithmParameters, EllipticCurve, Jwk, KeyAlgorithm};
use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

pub const KEYS_TTL: Duration = Duration::from_secs(300);
pub const MIN_REFETCH: Duration = Duration::from_secs(30);
pub const FETCH_TIMEOUT: Duration = Duration::from_secs(3);
/// Clock skew allowed on `exp`.
pub const LEEWAY_SECS: u64 = 30;
pub const AUDIENCE: &str = "authenticated";

/// What the API takes from a verified token. The role is not read from the
/// token: it comes from `app.users` (amendment П-1).
#[derive(Debug, Clone, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    #[serde(default)]
    pub is_anonymous: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    #[error("malformed token")]
    Malformed,
    #[error("unsupported token algorithm")]
    Algorithm,
    #[error("unknown signing key")]
    UnknownKey,
    #[error("invalid token: {0}")]
    Invalid(#[from] jsonwebtoken::errors::Error),
    #[error("anonymous sessions are not accepted")]
    Anonymous,
    /// The JWKS could not be fetched and no cached key matches.
    #[error("signing keys unavailable: {0}")]
    KeysUnavailable(String),
}

#[derive(Clone)]
struct Key {
    alg: Algorithm,
    decoding: DecodingKey,
}

#[derive(Default)]
struct KeySet {
    keys: HashMap<String, Key>,
    fetched_at: Option<Instant>,
}

impl KeySet {
    fn is_fresh(&self) -> bool {
        self.fetched_at.is_some_and(|at| at.elapsed() < KEYS_TTL)
    }

    fn fetched_recently(&self) -> bool {
        self.fetched_at.is_some_and(|at| at.elapsed() < MIN_REFETCH)
    }
}

enum Source {
    Remote {
        http: reqwest::Client,
        url: String,
    },
    /// A fixed set that is never refetched (tests).
    Fixed,
}

/// Verifies access tokens. One per process, shared through `AppState`.
pub struct Verifier {
    source: Source,
    issuer: String,
    keys: RwLock<KeySet>,
    refresh: Mutex<()>,
}

impl std::fmt::Debug for Verifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Verifier")
            .field("issuer", &self.issuer)
            .finish_non_exhaustive()
    }
}

impl Verifier {
    /// Keys from `jwks_url`, fetched on first use.
    pub fn remote(jwks_url: String, issuer: String) -> Result<Self, reqwest::Error> {
        let http = reqwest::Client::builder()
            .timeout(FETCH_TIMEOUT)
            .user_agent(concat!("beda-api/", env!("CARGO_PKG_VERSION")))
            .build()?;
        Ok(Self {
            source: Source::Remote {
                http,
                url: jwks_url,
            },
            issuer,
            keys: RwLock::new(KeySet::default()),
            refresh: Mutex::new(()),
        })
    }

    /// A fixed key set given as JWKS JSON; never refetched.
    pub fn fixed(jwks: &serde_json::Value, issuer: String) -> Self {
        Self {
            source: Source::Fixed,
            issuer,
            keys: RwLock::new(KeySet {
                keys: parse_jwks(jwks),
                fetched_at: None,
            }),
            refresh: Mutex::new(()),
        }
    }

    pub fn issuer(&self) -> &str {
        &self.issuer
    }

    /// Verifies `token` and returns its claims.
    pub async fn verify(&self, token: &str) -> Result<Claims, TokenError> {
        let header = jsonwebtoken::decode_header(token).map_err(|_| TokenError::Malformed)?;
        if !matches!(header.alg, Algorithm::ES256 | Algorithm::RS256) {
            return Err(TokenError::Algorithm);
        }
        let kid = header.kid.ok_or(TokenError::UnknownKey)?;
        let key = self.key(&kid).await?;
        if key.alg != header.alg {
            return Err(TokenError::Algorithm);
        }

        let mut validation = Validation::new(key.alg);
        validation.leeway = LEEWAY_SECS;
        validation.set_issuer(&[&self.issuer]);
        validation.set_audience(&[AUDIENCE]);
        validation.set_required_spec_claims(&["exp", "iss", "aud", "sub"]);
        let claims = jsonwebtoken::decode::<Claims>(token, &key.decoding, &validation)?.claims;
        if claims.is_anonymous {
            return Err(TokenError::Anonymous);
        }
        Ok(claims)
    }

    async fn key(&self, kid: &str) -> Result<Key, TokenError> {
        {
            let set = self.keys.read().await;
            if let Some(key) = set.keys.get(kid)
                && (set.is_fresh() || matches!(self.source, Source::Fixed))
            {
                return Ok(key.clone());
            }
        }
        let Source::Remote { http, url } = &self.source else {
            return Err(TokenError::UnknownKey);
        };

        // One fetch at a time; whoever waited re-checks what the first one got.
        let _guard = self.refresh.lock().await;
        {
            let set = self.keys.read().await;
            if let Some(key) = set.keys.get(kid)
                && set.is_fresh()
            {
                return Ok(key.clone());
            }
            if set.fetched_recently() {
                return Err(TokenError::UnknownKey);
            }
        }

        match fetch_jwks(http, url).await {
            Ok(keys) => {
                let mut set = self.keys.write().await;
                set.keys = keys;
                set.fetched_at = Some(Instant::now());
                set.keys.get(kid).cloned().ok_or(TokenError::UnknownKey)
            }
            Err(err) => {
                tracing::warn!(error = %err, "fetching the JWKS failed");
                let mut set = self.keys.write().await;
                // Back off like after a successful fetch; keep the old keys.
                set.fetched_at = Some(Instant::now());
                set.keys
                    .get(kid)
                    .cloned()
                    .ok_or_else(|| TokenError::KeysUnavailable(err.to_string()))
            }
        }
    }
}

async fn fetch_jwks(
    http: &reqwest::Client,
    url: &str,
) -> Result<HashMap<String, Key>, reqwest::Error> {
    let body: serde_json::Value = http
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    Ok(parse_jwks(&body))
}

/// Keys with a `kid` and a supported type; anything else in the set is skipped.
fn parse_jwks(body: &serde_json::Value) -> HashMap<String, Key> {
    let Some(keys) = body.get("keys").and_then(serde_json::Value::as_array) else {
        return HashMap::new();
    };
    keys.iter()
        .filter_map(|raw| {
            let jwk: Jwk = serde_json::from_value(raw.clone()).ok()?;
            let kid = jwk.common.key_id.clone()?;
            let alg = key_algorithm(&jwk)?;
            let decoding = DecodingKey::from_jwk(&jwk).ok()?;
            Some((kid, Key { alg, decoding }))
        })
        .collect()
}

/// ES256 for P-256 keys, RS256 for RSA keys; a stated `alg` must agree.
fn key_algorithm(jwk: &Jwk) -> Option<Algorithm> {
    let by_type = match &jwk.algorithm {
        AlgorithmParameters::EllipticCurve(ec) if ec.curve == EllipticCurve::P256 => {
            Algorithm::ES256
        }
        AlgorithmParameters::RSA(_) => Algorithm::RS256,
        _ => return None,
    };
    match jwk.common.key_algorithm {
        None => Some(by_type),
        Some(KeyAlgorithm::ES256) if by_type == Algorithm::ES256 => Some(by_type),
        Some(KeyAlgorithm::RS256) if by_type == Algorithm::RS256 => Some(by_type),
        Some(_) => None,
    }
}
