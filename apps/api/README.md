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
| `BEDA_SUPABASE_URL` | — | JWKS for auth, stage 2 |

## Which Supabase connection string

`sqlx` uses prepared statements, so use either:

- **Session pooler** (`…pooler.supabase.com:5432`, works over IPv4), or
- **Direct connection** (`db.<ref>.supabase.co:5432`) if the host has IPv6.

Do **not** use the transaction pooler (port 6543): it breaks prepared statements.
Connect as `beda_api` (see `docs/adr/0002-api-db-role.md`), never as `postgres` or `service_role`.

Locally, `supabase start` prints the DB URL; `task db:dev-role` gives `beda_api` the dev password
`beda_api_dev`, so the API uses `postgresql://beda_api:beda_api_dev@127.0.0.1:54322/postgres`.

## Queries

Queries use `sqlx::query!` and are checked at compile time. After changing SQL run `task gen`
(`cargo sqlx prepare --workspace` against the local database) and commit `/.sqlx`.
Builds without a database use `SQLX_OFFLINE=true`.

## Tests

`cargo test` runs everything; database tests need `BEDA_TEST_DATABASE_URL` (the local
`postgres` superuser URL) and are skipped without it. Each runs in a rolled-back transaction.
