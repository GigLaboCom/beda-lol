# S02 — Supabase: local stack, migrations, sqlx

Stage 0 · Depends on: S01 · Medium · Follows amendments П-1 and П-2

## Goal
The Supabase CLI runs a local stack, the first migration creates schema `app` with RLS on, the API connects with `sqlx` and compile-time-checked queries, and `/api/readyz` checks the database.

## Read first
- `docs/08-amendments.md` → П-1 (rules 1, 4, 5) and П-2 (rules 1, 2)
- Spec «База данных» — table list still applies; schema name is `app`
- Supabase CLI docs for the installed version: `init`, `start`, `migration new`, `db reset`, `db push`, exposed schemas config
- `sqlx` docs: `query!`, offline mode (`cargo sqlx prepare`, `SQLX_OFFLINE`)

## Tasks
1. `supabase init` at the repo root → `supabase/config.toml`. In the API section keep exposed schemas to what Supabase needs (`public`, `graphql_public`); **`app` must not be listed**. Auth providers stay disabled until stage 2.
2. First migration `supabase migration new init`:
   - `create schema app;` revoke all on schema `app` from `anon`, `authenticated`; revoke default privileges too.
   - `app.quiz_attempts` (`id bigserial`, `scores smallint[] check (array_length(scores,1)=6)`, `class text`, `shared bool default false`, `source text`, `created_at timestamptz default now()`)
   - `app.events` (`id bigserial`, `name text not null`, `user_id uuid null`, `anon_id text null`, `props jsonb default '{}'`, `created_at timestamptz default now()`), index `(name, created_at)`
   - `app.jobs` (outbox: `id bigserial`, `kind text`, `payload jsonb`, `run_at timestamptz default now()`, `attempts int default 0`, `last_error text`, `done_at timestamptz`), partial index on `run_at where done_at is null`
   - `app.set_updated_at()` trigger function
   - `alter table … enable row level security` on every table, no policies.
   - Role `beda_api` for the API: `login`, usage on schema `app`, needed table privileges and sequence usage, and `bypassrls` (document the choice in `docs/adr/0002-api-db-role.md`). Created without a password; the password is set by hand per environment (dev helper below, prod in S06 [HUMAN]).
3. `supabase/seed.sql`: empty placeholder with a comment.
4. `apps/api` dependencies: `sqlx` (runtime-tokio, tls-rustls, postgres, macros, uuid, chrono or time, json). `src/store/mod.rs`: `PgPool` from `BEDA_DATABASE_URL`, max connections from config (default 10), `after_connect` sets `search_path = app`, `ping()` with a 2 s timeout. `apps/api/README.md` documents which Supabase connection string to use (session pooler or direct; not transaction pooler — prepared statements).
5. `src/store/quiz.rs`: `insert_quiz_attempt` with `sqlx::query!` against `app.quiz_attempts`. Commit the generated `.sqlx/` directory.
6. `/api/readyz`: 200 when `ping` succeeds within 2 s, 503 with the error shape otherwise. Pool is in axum state.
7. Taskfile:
   - `dev` runs `supabase start` (idempotent), `task db:dev-role` (sets a dev-only password for `beda_api` on the local DB), exports `BEDA_DATABASE_URL`, then api and web (web from S03 — guard it).
   - `db:reset` → `supabase db reset` + `db:dev-role`; `migrate:new` → `supabase migration new`.
   - `gen` → `cargo sqlx prepare --workspace` (needs the local DB running).
   - `check` adds `cargo sqlx prepare --workspace --check`; builds with `SQLX_OFFLINE=true` must also pass.
8. Tests (run against the local Supabase DB, each inside a transaction that is rolled back — do not create databases per test, the `auth` schema only exists in the main database):
   - insert and read a quiz attempt;
   - as role `anon`, selecting from `app.quiz_attempts` fails with permission denied.

## Out of scope
No auth wiring (stage 2), no UGC tables. No `compose.dev.yaml` — the Supabase CLI replaces it.

## Verify
- `task dev` → `supabase start` up, `readyz` 200.
- `supabase stop` → `readyz` 503.
- Through the local Data API with the anon key, `app` tables are unreachable.
- `SQLX_OFFLINE=true cargo build -p beda-api` succeeds without a database.
- `task check` green.

## Done when
- [ ] Supabase CLI project, `app` schema not exposed, RLS on
- [ ] `beda_api` role, ADR 0002
- [ ] `sqlx` pool, first checked query, `.sqlx/` committed
- [ ] readyz checks DB
- [ ] PROGRESS.md updated
