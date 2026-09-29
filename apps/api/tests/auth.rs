//! Token verification and the `CurrentUser` extractor, end to end.
//!
//! Tokens are signed with a P-256 key generated per test run, and the verifier
//! gets its public half as a fixed JWKS, so no key material lives in the repo.
//! Tests that need users run against `BEDA_TEST_DATABASE_URL` (see `db.rs`)
//! and are skipped without it; they create an `auth.users` row, which the
//! trigger provisions, and delete it at the end (the app rows cascade).
#![allow(clippy::unwrap_used)]

use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use base64::Engine as _;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use beda_api::auth::{AuthAdmin, Secret, TokenError, Verifier};
use beda_api::{AppState, Config, Store, app};
use http_body_util::BodyExt as _;
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use ring::rand::SystemRandom;
use ring::signature::{ECDSA_P256_SHA256_FIXED_SIGNING, EcdsaKeyPair, KeyPair as _};
use serde_json::{Value, json};
use tower::ServiceExt as _;
use uuid::Uuid;

const ISSUER: &str = "http://127.0.0.1:54321/auth/v1";
const KID: &str = "test-key";

struct Keys {
    encoding: EncodingKey,
    jwks: Value,
}

fn keys() -> Keys {
    let rng = SystemRandom::new();
    let pkcs8 = EcdsaKeyPair::generate_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, &rng).unwrap();
    let pair =
        EcdsaKeyPair::from_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, pkcs8.as_ref(), &rng).unwrap();
    // Uncompressed point: 0x04 || x || y.
    let point = pair.public_key().as_ref();
    let jwk = json!({
        "kty": "EC",
        "crv": "P-256",
        "x": URL_SAFE_NO_PAD.encode(&point[1..33]),
        "y": URL_SAFE_NO_PAD.encode(&point[33..65]),
        "kid": KID,
        "alg": "ES256",
        "use": "sig",
    });
    Keys {
        encoding: EncodingKey::from_ec_der(pkcs8.as_ref()),
        jwks: json!({ "keys": [jwk, { "kty": "oct", "k": "c2VjcmV0", "kid": "hmac" }] }),
    }
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn claims(sub: Uuid) -> Value {
    json!({
        "sub": sub,
        "aud": "authenticated",
        "iss": ISSUER,
        "exp": now() + 600,
        "role": "authenticated",
    })
}

fn sign(keys: &Keys, claims: &Value) -> String {
    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some(KID.to_owned());
    jsonwebtoken::encode(&header, claims, &keys.encoding).unwrap()
}

fn verifier(keys: &Keys) -> Verifier {
    Verifier::fixed(&keys.jwks, ISSUER.to_owned())
}

#[tokio::test]
async fn valid_token_gives_its_subject() {
    let keys = keys();
    let sub = Uuid::new_v4();
    let got = verifier(&keys)
        .verify(&sign(&keys, &claims(sub)))
        .await
        .unwrap();
    assert_eq!(got.sub, sub);
}

#[tokio::test]
async fn wrong_claims_are_rejected() {
    let keys = keys();
    let v = verifier(&keys);
    let sub = Uuid::new_v4();
    let with = |key: &str, value: Value| {
        let mut c = claims(sub);
        c[key] = value;
        sign(&keys, &c)
    };
    for token in [
        with("iss", json!("https://evil.example/auth/v1")),
        with("aud", json!("anon")),
        with("exp", json!(now() - 3600)),
        with("sub", json!("not-a-uuid")),
        with("is_anonymous", json!(true)),
    ] {
        assert!(v.verify(&token).await.is_err(), "{token}");
    }
    let mut no_exp = claims(sub);
    no_exp.as_object_mut().unwrap().remove("exp");
    assert!(v.verify(&sign(&keys, &no_exp)).await.is_err());
}

#[tokio::test]
async fn foreign_keys_and_algorithms_are_rejected() {
    let keys = keys();
    let v = verifier(&keys);
    let sub = Uuid::new_v4();

    // Signed by another key under the same kid.
    let other = self::keys();
    assert!(matches!(
        v.verify(&sign(&other, &claims(sub))).await,
        Err(TokenError::Invalid(_))
    ));

    // Unknown kid.
    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some("rotated-away".to_owned());
    let token = jsonwebtoken::encode(&header, &claims(sub), &keys.encoding).unwrap();
    assert!(matches!(
        v.verify(&token).await,
        Err(TokenError::UnknownKey)
    ));

    // HS256 with the (skipped) symmetric key from the set.
    let mut header = Header::new(Algorithm::HS256);
    header.kid = Some("hmac".to_owned());
    let token =
        jsonwebtoken::encode(&header, &claims(sub), &EncodingKey::from_secret(b"secret")).unwrap();
    assert!(matches!(v.verify(&token).await, Err(TokenError::Algorithm)));

    // Tampered payload.
    let token = sign(&keys, &claims(sub));
    let mut parts: Vec<&str> = token.split('.').collect();
    let forged = URL_SAFE_NO_PAD.encode(claims(Uuid::new_v4()).to_string());
    parts[1] = &forged;
    assert!(v.verify(&parts.join(".")).await.is_err());

    assert!(matches!(
        v.verify("garbage").await,
        Err(TokenError::Malformed)
    ));
}

#[tokio::test]
async fn remote_keys_are_cached_and_unknown_kids_do_not_refetch() {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    let keys = keys();
    let hits = Arc::new(AtomicUsize::new(0));
    let jwks = keys.jwks.clone();
    let counter = hits.clone();
    let server = axum::Router::new().route(
        "/auth/v1/.well-known/jwks.json",
        axum::routing::get(move || {
            counter.fetch_add(1, Ordering::SeqCst);
            let jwks = jwks.clone();
            async move { axum::Json(jwks) }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, server).await.unwrap() });

    let v = Verifier::remote(
        format!("http://{addr}/auth/v1/.well-known/jwks.json"),
        ISSUER.to_owned(),
    )
    .unwrap();
    let token = sign(&keys, &claims(Uuid::new_v4()));
    v.verify(&token).await.unwrap();
    v.verify(&token).await.unwrap();
    assert_eq!(hits.load(Ordering::SeqCst), 1, "keys are cached");

    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some("unknown".to_owned());
    let stranger = jsonwebtoken::encode(&header, &claims(Uuid::new_v4()), &keys.encoding).unwrap();
    assert!(matches!(
        v.verify(&stranger).await,
        Err(TokenError::UnknownKey)
    ));
    assert!(matches!(
        v.verify(&stranger).await,
        Err(TokenError::UnknownKey)
    ));
    assert_eq!(
        hits.load(Ordering::SeqCst),
        1,
        "no refetch right after a fetch"
    );
}

#[tokio::test]
async fn unreachable_jwks_is_unavailable_not_unauthorized() {
    let keys = keys();
    let v = Verifier::remote("http://127.0.0.1:1/jwks.json".to_owned(), ISSUER.to_owned()).unwrap();
    let token = sign(&keys, &claims(Uuid::new_v4()));
    assert!(matches!(
        v.verify(&token).await,
        Err(TokenError::KeysUnavailable(_))
    ));
}

// ---- HTTP ----

fn store(url: &str) -> Store {
    Store::connect_lazy(url, 2).unwrap()
}

fn test_app(state: AppState) -> axum::Router {
    app(&Config::default(), state)
}

async fn get_me(
    router: axum::Router,
    token: Option<&str>,
    account: Option<&str>,
) -> (StatusCode, Value, axum::http::HeaderMap) {
    let mut req = Request::get("/api/me");
    if let Some(token) = token {
        req = req.header("authorization", format!("Bearer {token}"));
    }
    if let Some(account) = account {
        req = req.header("x-beda-account", account);
    }
    let res = router
        .oneshot(req.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = res.status();
    let headers = res.headers().clone();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(Value::Null),
        headers,
    )
}

#[tokio::test]
async fn me_needs_a_valid_token() {
    let keys = keys();
    let state =
        AppState::new(store("postgres://nobody@127.0.0.1:1/none")).with_auth(verifier(&keys));

    let (status, body, headers) = get_me(test_app(state.clone()), None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"]["code"], "unauthorized");
    assert_eq!(headers["www-authenticate"], "Bearer");

    let (status, _, _) = get_me(test_app(state), Some("not.a.token"), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn me_is_unavailable_without_auth_config() {
    let keys = keys();
    let state = AppState::new(store("postgres://nobody@127.0.0.1:1/none"));
    let token = sign(&keys, &claims(Uuid::new_v4()));
    let (status, body, _) = get_me(test_app(state), Some(&token), None).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["error"]["code"], "unavailable");
}

fn database_url() -> Option<String> {
    let url = std::env::var("BEDA_TEST_DATABASE_URL")
        .ok()
        .filter(|v| !v.is_empty());
    if url.is_none() {
        eprintln!("BEDA_TEST_DATABASE_URL not set, skipping database test");
    }
    url
}

/// An `auth.users` row, as Supabase Auth would create it; removed on drop.
struct AuthUser {
    id: Uuid,
    pool: sqlx::PgPool,
}

impl AuthUser {
    async fn create(url: &str, meta: Value) -> Self {
        let pool = sqlx::PgPool::connect(url).await.unwrap();
        let id = Uuid::new_v4();
        sqlx::query(
            "insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
             values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3)",
        )
        .bind(id)
        .bind(format!("{id}@example.test"))
        .bind(meta)
        .execute(&pool)
        .await
        .unwrap();
        Self { id, pool }
    }

    async fn delete(self) {
        sqlx::query("delete from auth.users where id = $1")
            .bind(self.id)
            .execute(&self.pool)
            .await
            .unwrap();
    }
}

#[tokio::test]
async fn me_returns_the_user_and_the_personal_account() {
    let Some(url) = database_url() else { return };
    let keys = keys();
    let user = AuthUser::create(&url, json!({ "user_name": "octocat" })).await;
    let state = AppState::new(store(&url)).with_auth(verifier(&keys));
    let token = sign(&keys, &claims(user.id));

    let (status, body, headers) = get_me(test_app(state.clone()), Some(&token), None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(headers["cache-control"], "no-store");
    assert_eq!(body["id"], json!(user.id));
    assert_eq!(body["display_name"], "octocat");
    assert_eq!(body["role"], "user");
    assert_eq!(body["trusted"], false);
    assert_eq!(body["account"]["kind"], "personal");
    assert_eq!(body["account"]["role"], "owner");
    assert_eq!(body["accounts"].as_array().unwrap().len(), 1);
    let account = body["account"]["id"].as_str().unwrap().to_owned();

    // The same account by header; a foreign or malformed one is refused.
    let (status, body, _) = get_me(test_app(state.clone()), Some(&token), Some(&account)).await;
    assert_eq!(
        (status, body["account"]["id"].as_str()),
        (StatusCode::OK, Some(account.as_str()))
    );
    let foreign = Uuid::new_v4().to_string();
    let (status, _, _) = get_me(test_app(state.clone()), Some(&token), Some(&foreign)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _, _) = get_me(test_app(state), Some(&token), Some("nope")).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    user.delete().await;
}

#[tokio::test]
async fn blocked_and_unknown_users_are_refused() {
    let Some(url) = database_url() else { return };
    let keys = keys();
    let user = AuthUser::create(&url, json!({})).await;
    let state = AppState::new(store(&url)).with_auth(verifier(&keys));
    let token = sign(&keys, &claims(user.id));

    sqlx::query("update app.users set status = 'blocked' where id = $1")
        .bind(user.id)
        .execute(&user.pool)
        .await
        .unwrap();
    let (status, body, _) = get_me(test_app(state.clone()), Some(&token), None).await;
    assert_eq!(status, StatusCode::FORBIDDEN, "{body}");

    // A valid token for someone the app has no row for.
    let stranger = sign(&keys, &claims(Uuid::new_v4()));
    let (status, _, _) = get_me(test_app(state), Some(&stranger), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    user.delete().await;
}

// ---- Account deletion ----

async fn delete_me(router: axum::Router, token: &str) -> (StatusCode, Value) {
    let req = Request::delete("/api/me")
        .header("authorization", format!("Bearer {token}"))
        .body(Body::empty())
        .unwrap();
    let res = router.oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(Value::Null),
    )
}

/// What the fake Admin API saw: the path and the `apikey` header of each call.
type AdminCalls = std::sync::Arc<std::sync::Mutex<Vec<(String, String)>>>;

/// A stand-in for Supabase's `/auth/v1/admin/users/{id}`. Given a pool, it
/// removes the `auth.users` row as Supabase Auth would; without one it answers 500.
async fn fake_admin(pool: Option<sqlx::PgPool>) -> (String, AdminCalls) {
    let calls = AdminCalls::default();
    let seen = calls.clone();
    let server = axum::Router::new().route(
        "/auth/v1/admin/users/{id}",
        axum::routing::delete(
            move |axum::extract::Path(id): axum::extract::Path<Uuid>,
                  headers: axum::http::HeaderMap| {
                let seen = seen.clone();
                let pool = pool.clone();
                async move {
                    let key = headers
                        .get("apikey")
                        .and_then(|v| v.to_str().ok())
                        .unwrap_or_default()
                        .to_owned();
                    seen.lock()
                        .unwrap()
                        .push((format!("/auth/v1/admin/users/{id}"), key));
                    let Some(pool) = pool else {
                        return StatusCode::INTERNAL_SERVER_ERROR;
                    };
                    sqlx::query("delete from auth.users where id = $1")
                        .bind(id)
                        .execute(&pool)
                        .await
                        .unwrap();
                    StatusCode::OK
                }
            },
        ),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, server).await.unwrap() });
    (format!("http://{addr}"), calls)
}

async fn event_user(pool: &sqlx::PgPool, event: i64) -> Option<Uuid> {
    sqlx::query_scalar("select user_id from app.events where id = $1")
        .bind(event)
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn event_by(pool: &sqlx::PgPool, user: Uuid) -> i64 {
    sqlx::query_scalar("insert into app.events (name, user_id) values ('test', $1) returning id")
        .bind(user)
        .fetch_one(pool)
        .await
        .unwrap()
}

#[tokio::test]
async fn deleting_the_account_anonymises_first_then_deletes_the_user() {
    let Some(url) = database_url() else { return };
    let keys = keys();
    let user = AuthUser::create(&url, json!({})).await;
    let event = event_by(&user.pool, user.id).await;
    let (base, calls) = fake_admin(Some(user.pool.clone())).await;
    let state = AppState::new(store(&url))
        .with_auth(verifier(&keys))
        .with_admin(AuthAdmin::new(&base, Secret::new("sb_secret_test".to_owned())).unwrap());
    let token = sign(&keys, &claims(user.id));

    // Loaded once, so the cache holds the user: deletion must drop it.
    let (status, _, _) = get_me(test_app(state.clone()), Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);

    let (status, body) = delete_me(test_app(state.clone()), &token).await;
    assert_eq!(status, StatusCode::NO_CONTENT, "{body}");
    assert_eq!(
        *calls.lock().unwrap(),
        [(
            format!("/auth/v1/admin/users/{}", user.id),
            "sb_secret_test".to_owned()
        )]
    );
    assert_eq!(
        event_user(&user.pool, event).await,
        None,
        "event anonymised"
    );
    let left: i64 = sqlx::query_scalar("select count(*) from app.users where id = $1")
        .bind(user.id)
        .fetch_one(&user.pool)
        .await
        .unwrap();
    assert_eq!(left, 0, "app.users row cascaded away");

    // The token is still unexpired, but it no longer belongs to anyone.
    let (status, _, _) = get_me(test_app(state), Some(&token), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    sqlx::query("delete from app.events where id = $1")
        .bind(event)
        .execute(&user.pool)
        .await
        .unwrap();
}

#[tokio::test]
async fn a_failed_admin_call_keeps_the_user_and_can_be_retried() {
    let Some(url) = database_url() else { return };
    let keys = keys();
    let user = AuthUser::create(&url, json!({})).await;
    let event = event_by(&user.pool, user.id).await;
    let (base, calls) = fake_admin(None).await;
    let state = AppState::new(store(&url))
        .with_auth(verifier(&keys))
        .with_admin(AuthAdmin::new(&base, Secret::new("k".to_owned())).unwrap());
    let token = sign(&keys, &claims(user.id));

    let (status, body) = delete_me(test_app(state.clone()), &token).await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR, "{body}");
    assert_eq!(calls.lock().unwrap().len(), 1);
    // Records are detached already; the account is still there to retry with.
    assert_eq!(event_user(&user.pool, event).await, None);
    let (status, _, _) = get_me(test_app(state), Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);

    sqlx::query("delete from app.events where id = $1")
        .bind(event)
        .execute(&user.pool)
        .await
        .unwrap();
    user.delete().await;
}

#[tokio::test]
async fn deletion_is_unavailable_without_the_secret_key() {
    let Some(url) = database_url() else { return };
    let keys = keys();
    let user = AuthUser::create(&url, json!({})).await;
    let state = AppState::new(store(&url)).with_auth(verifier(&keys));
    let token = sign(&keys, &claims(user.id));
    let (status, body) = delete_me(test_app(state.clone()), &token).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
    let (status, _, _) = get_me(test_app(state), Some(&token), None).await;
    assert_eq!(status, StatusCode::OK, "nothing was deleted");
    user.delete().await;
}
