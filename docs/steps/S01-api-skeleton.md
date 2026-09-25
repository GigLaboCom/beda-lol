# S01 — Rust API skeleton

Stage 0 · Depends on: S00 · Small–medium · Follows amendment П-2

## Goal
`apps/api` builds a single binary `beda-api` (Rust, axum) whose `serve` subcommand answers `GET /api/healthz` with graceful shutdown, structured logs and typed config from env.

## Read first
- `docs/08-amendments.md` → П-2 (stack table and rules) — this step implements it
- Spec «Бэк на Go» — layout, middleware chain, subcommands; read it as "the API", the language is Rust now
- `CLAUDE.md` → Stack, Commands

## Tasks
1. `rust-toolchain.toml` at the repo root: current stable channel pinned to an exact version, components `rustfmt`, `clippy`; target `x86_64-unknown-linux-musl` listed for image builds.
2. Cargo workspace at the repo root (`Cargo.toml` with `[workspace] members = ["apps/api"]`, `resolver = "2"`, shared `[workspace.package]` edition = current edition, `[workspace.lints]` with `unsafe_code = "forbid"` and clippy `pedantic` as warn with a short allow-list). The workspace leaves room for a later `crates/storm` (WASM) without restructuring.
3. `apps/api/Cargo.toml`, crate `beda-api`. Dependencies (current versions): `tokio` (rt-multi-thread, macros, signal), `axum`, `tower`, `tower-http` (trace, request-id, limit, timeout, cors off), `tracing`, `tracing-subscriber` (env-filter, json), `serde`, `serde_json`, `thiserror`, `anyhow`, `clap` (derive), `uuid` (v4). Nothing else in this step.
4. `src/main.rs`: `clap` subcommands `serve`, `admin` (stub that prints "added in S16"), `healthcheck` (TCP connect to `127.0.0.1:$PORT`, send `GET /api/readyz`, exit 0 on `200`, 1 otherwise — no HTTP client dependency, used by the distroless container), `version` (prints `env!("CARGO_PKG_VERSION")` plus the git SHA passed as `BEDA_BUILD_SHA` at build time via `option_env!`).
5. `src/config.rs`: typed config from env with defaults and validation, errors listing every problem at once:
   `BEDA_ENV` (`dev` | `prod`, default `dev`), `BEDA_HTTP_ADDR` (default `0.0.0.0:8080`), `BEDA_BASE_URL` (default `http://localhost:4321`), `BEDA_LOG` (tracing filter, default `info`), `BEDA_DATABASE_URL` (required from S02, optional now), `BEDA_SUPABASE_URL` (optional now; JWKS in stage 2).
6. `src/telemetry.rs`: `tracing-subscriber` JSON formatter in prod, pretty in dev; filter from `BEDA_LOG`.
7. `src/http/`:
   - `mod.rs` — router under `/api`, layers in this order: `SetRequestIdLayer` (UUID, header `x-request-id`) → `TraceLayer` (method, path, status, latency, request id) → `PropagateRequestIdLayer` → `RequestBodyLimitLayer(64 KiB)` → `TimeoutLayer(15 s)`; panics caught and turned into 500 with a log line (`CatchPanicLayer`).
   - `error.rs` — `AppError` (`thiserror`) implementing `IntoResponse` with the stable shape `{"error":{"code":"…","message":"…"}}`; no internal details leak in prod.
   - `health.rs` — `GET /api/healthz` → `{"status":"ok"}`; `GET /api/readyz` → same for now (DB check in S02).
8. `serve`: `axum::serve` on a `TcpListener`, graceful shutdown on SIGINT and SIGTERM with a 10 s drain timeout; log start and stop.
9. `src/lib.rs` exposes `app(config) -> Router` so integration tests can call it with `tower::ServiceExt::oneshot`.
10. Tests: healthz status and body; request id is generated when absent and echoed when present; body over 64 KiB → 413; a route that panics → 500 with the error shape.
11. `deny.toml` for `cargo-deny`: allowed licenses (MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unicode-3.0, Zlib, MPL-2.0 — adjust to what the tree actually needs and list why), advisories on, bans for duplicate major versions as warnings.
12. Taskfile: `api:dev` runs `watchexec -r -e rs,toml -- cargo run -p beda-api -- serve` (document `watchexec` in BOOTSTRAP if missing); `test` and `lint` include Rust; `check` runs `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, `cargo deny check`.

## Out of scope
No database, no auth, no business endpoints, no HTTP client crate.

## Verify
- `cargo build -p beda-api` from the repo root; `cargo run -p beda-api -- version`.
- `task api:dev`, then `curl -i localhost:8080/api/healthz` → 200, JSON, `x-request-id` header.
- `cargo run -p beda-api -- healthcheck` exits 0 while the server runs and 1 when it doesn't.
- Ctrl-C shuts down cleanly with a log line.
- `task check` green.

## Done when
- [ ] Workspace, toolchain, crate build
- [ ] healthz, readyz, healthcheck subcommand
- [ ] Layers tested
- [ ] fmt, clippy, deny clean
- [ ] PROGRESS.md updated
