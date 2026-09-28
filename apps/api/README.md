# beda-api

Rust API for beda.lol: one binary with subcommands `serve`, `admin`, `healthcheck`, `version`.

```sh
cargo run -p beda-api -- serve        # needs BEDA_DATABASE_URL
cargo run -p beda-api -- version
task api:dev                          # with reload (watchexec)
```

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `BEDA_ENV` | `dev` | `dev` or `prod` (JSON logs in prod) |
| `BEDA_HTTP_ADDR` | `0.0.0.0:8080` | listen address |
| `BEDA_BASE_URL` | `http://localhost:4321` | public site URL |
| `BEDA_LOG` | `info` | tracing filter, e.g. `beda_api=debug,info` |
| `BEDA_DATABASE_URL` | — (required) | Postgres URL of the `beda_api` role |
| `BEDA_DB_MAX_CONNECTIONS` | `10` | pool size |
| `BEDA_SUPABASE_URL` | — (required in prod) | Supabase project URL; the API fetches its signing keys from `/auth/v1/.well-known/jwks.json`. Without it, routes that need a user answer 503 |
| `BEDA_JWT_ISSUER` | `{BEDA_SUPABASE_URL}/auth/v1` | expected `iss` of access tokens, for when the API reaches Supabase by another host name than the browser does (Docker) |

## Which Supabase connection string

`sqlx` uses prepared statements, so use either:

- **Session pooler** (`…pooler.supabase.com:5432`, works over IPv4), or
- **Direct connection** (`db.<ref>.supabase.co:5432`) if the host has IPv6.

Do **not** use the transaction pooler (port 6543): it breaks prepared statements.
Connect as `beda_api` (see `docs/adr/0002-api-db-role.md`), never as `postgres` or `service_role`.

Locally, `supabase start` prints the DB URL; `task db:dev-role` gives `beda_api` the dev password
`beda_api_dev`, so the API uses `postgresql://beda_api:beda_api_dev@127.0.0.1:54322/postgres`.

## Users and accounts

Every handler can get the user behind the request as an extractor (ADR 0003):

```rust
async fn handler(user: CurrentUser) -> … { user.id(); user.account.id; user.require_role(Role::Moderator)?; … }
async fn public(user: Option<CurrentUser>) -> … { … } // guests get None, a bad token is still 401
```

- `Authorization: Bearer <Supabase access token>`, verified locally against the JWKS.
- The user comes from `app.users` (created by a trigger when Supabase Auth creates the auth user) and is cached for 60 s.
- `user.account` is the account (tenant) the request acts in: the one named by the `x-beda-account` header, if the user is a member of it, otherwise the personal account.
- Tables with user data carry `account_id`, and handlers take it from `user.account.id`, never from the body.
- Errors: 401 with no token, a bad token or an unknown user; 403 for a blocked user, a foreign account or a missing role; 400 for a malformed `x-beda-account`; 503 when auth is not configured or the keys cannot be fetched.
- `GET /api/me` returns the user, the current account and all of the user's accounts.

## Queries

Queries use `sqlx::query!` and are checked at compile time. After changing SQL run `task gen`
(`cargo sqlx prepare --workspace` against the local database) and commit `/.sqlx`.
Builds without a database use `SQLX_OFFLINE=true`.

## Tests

`cargo test` runs everything; database tests need `BEDA_TEST_DATABASE_URL` (the local
`postgres` superuser URL) and are skipped without it. Each runs in a rolled-back transaction,
except the `/api/me` tests in `tests/auth.rs`: they create an `auth.users` row and delete it at the end.
Tokens in tests are signed with a key generated per run; no key material is committed.
