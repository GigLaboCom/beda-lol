# Progress

Tick a step only when its "Done when" list is fully met and `task check` passes.

## Stage 0 — Foundation
- [x] S00 Repository bootstrap
- [x] S01 Rust API skeleton
- [x] S02 Supabase: local stack, migrations, sqlx
- [x] S03 Astro web skeleton and tokens
- [x] S04 CI and repository hygiene
- [x] S05 Container images and prod compose
- [ ] S06 Server, deploy workflow, backups

## Stage 1 — Static site and quiz
- [ ] S07 packages/core
- [ ] S08 packages/transom
- [ ] S09 Home page
- [ ] S10 Ship inspection quiz and result page
- [ ] S11 Name game page
- [ ] S12 Six pillar articles
- [ ] S13 Share images
- [ ] S14 SEO baseline and stage 1 launch

## Stages 2–6
See `ROADMAP.md`. Expand each into a step file before starting it.

---

## Handover log

(append entries below, newest last)

### S00 — Repository bootstrap — 2026-09-25
- Done: archive moved to `archive/` and `docs/` (plus `docs/tactics/`, `docs/BOOTSTRAP.md`), Claude Code kit in place; root config (`.editorconfig`, `.gitignore`, `.node-version`, MIT `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `nx.json`, `biome.json`), `Taskfile.yml` with stub tasks, `.gitkeep` dirs, ADR 0001.
- Deviations from step/spec: **Nx instead of Turborepo** (`nx.json` instead of `turbo.json`; the human asked for Nx on the frontend) — step files S00, S05, S13 and `CLAUDE.md` updated. **Domain `beda.lol`** instead of `beda.giglabo.com` (the repo is `GigLaboCom/beda-lol` and its README names beda.lol); spec docs keep the old name, step files and `CLAUDE.md` use the new one. OWNER = `GigLaboCom`. `_import/` was never created: the archive was unpacked straight into place.
- New deps: `nx` 23 (task orchestration, replaces turbo), `@biomejs/biome` 2.5 (lint/format, named in the step). pnpm pinned to 10.33.0 via `packageManager`.
- Follow-ups: none.
- [HUMAN] open: none.

### S01 — Rust API skeleton — 2026-09-25
- Done: Cargo workspace at the root (edition 2024, shared lints: `unsafe_code = forbid`, clippy pedantic), `rust-toolchain.toml`, crate `beda-api` in `apps/api` with `serve` / `admin` (stub) / `healthcheck` (raw TCP probe of `/api/readyz`) / `version`; typed env config reporting all problems at once; tracing (JSON in prod); middleware stack request id → trace → propagate id → 64 KiB body limit → 15 s timeout → catch panic; `AppError` with the `{"error":{"code","message"}}` shape (also used for 404 fallback and panics); graceful shutdown with 10 s drain. Tests: healthz, request id generated/echoed, 413, panic → 500, config parsing. `deny.toml`. The API is also an Nx project (`apps/api/project.json`: build, test, lint, deny, dev) so `nx run-many -t test` covers Rust too.
- Deviations from step/spec: toolchain pinned to 1.94.1 (the version available in the build environment; bump in a follow-up). `clippy.toml` allows `unwrap`/`expect` in tests. Timeout answers 503 (`TimeoutLayer::with_status_code`).
- New deps: tokio, axum 0.8, tower, tower-http 0.7, tracing, tracing-subscriber, serde, serde_json, thiserror, anyhow, clap, uuid (all named in the step); dev: http-body-util (read bodies in tests).
- Follow-ups: install `watchexec` locally for `task api:dev`.
- [HUMAN] open: none.

### S02 — Supabase: local stack, migrations, sqlx — 2026-09-25
- Done: `supabase/config.toml` from `supabase init` (CLI 2.117; `app` not in exposed schemas; realtime, storage, edge runtime, analytics off; sign-ups off until stage 2), migration `init` (schema `app` with revoked defaults, `quiz_attempts`, `events`, `jobs`, `set_updated_at()`, RLS on everything with no policies, role `beda_api` with `bypassrls`), empty `seed.sql`, ADR 0002. API: `sqlx` pool (lazy, `search_path = app`, 2 s ping), `insert_quiz_attempt` via `query_scalar!`, `.sqlx/` committed, `/api/readyz` → 503 with the error shape when the DB is down. Taskfile: `dev`, `db:url`, `db:api-url`, `db:dev-role`, `db:reset`, `migrate:new`, `gen`, `gen:check`; `check` adds `sqlx prepare --check` and an offline release build.
- Verified on a real `supabase start` (Docker): migration applies from zero (`supabase db reset`), readyz 200 → 503 after stopping the DB → 200, `Accept-Profile: app` through the Data API with the anon key → `PGRST106 Invalid schema: app`, `SQLX_OFFLINE=true cargo build` without a DB, `task check` green.
- Deviations from step/spec: the migration also grants `beda_api` to the migration owner (`postgres`): on Postgres 16+ the creator cannot `set role` to a new role otherwise, and tests act as `beda_api` inside their transaction. `class` in `quiz_attempts` is nullable (the API may not know it). DB tests skip when `BEDA_TEST_DATABASE_URL` is unset. Added `BEDA_DB_MAX_CONNECTIONS` (default 10).
- New deps: `sqlx` 0.9 (runtime-tokio, tls-rustls, postgres, macros, uuid, chrono, json).
- Follow-ups: none.
- [HUMAN] open: none.

### S03 — Astro web skeleton and tokens — 2026-09-25
- Done: `packages/tokens` (`@beda/tokens`: `tokens.css` with every prototype custom property + dark-scheme and `data-theme` overrides, `fonts.css` importing Fontsource Playfair Display 700/900, IBM Plex Sans 400/500/600, IBM Plex Mono 400/500 — Cyrillic + Latin only, `font-display: swap`; Vitest check). `apps/web` (Astro 7, `@astrojs/node` standalone, `@astrojs/preact`, strict TS): `Base.astro` (lang ru, viewport-fit, safe-area, description/canonical/robots, skip link, sticky header, footer), `i18n/ru.ts` with typed `t()`, placeholder home with a static CSS transom (П hanging, О fallen), Vite proxy `/api` → `:8080`. Root `tsconfig.base.json`, root `vitest.config.ts` (projects `packages/*`). Nx sees `web`, `@beda/tokens`, `api`; Taskfile `web:dev`, `build`; `check` builds through Nx.
- Verified: `astro check` 0 errors; `node apps/web/dist/server/entry.mjs` serves the page; `curl :4321/api/healthz` and `/api/readyz` answer through the dev proxy; screenshots at 375 and 1280 px — no horizontal scroll, fonts and colours as in the prototype.
- Deviations from step/spec: canonical URLs come from Astro `site` = `BEDA_BASE_URL` (default `https://beda.lol`). Extra tokens (`--hole`, `--glyph-shadow`, `--nail-iron`, `--shelf-light`, `--ink-hover`, `--wreck-empty-text`) hold colours the prototype had inline, so components never use raw hex. Footer sits outside `<main>` (landmark). TypeScript 6 (TS 7 is not supported by `astro check`). Biome: unused-import/variable rules are off for `.astro` (Biome cannot see template usage).
- New deps: astro 7, @astrojs/node, @astrojs/preact, preact, @astrojs/check, typescript 6, @types/node 22 (named in the step or needed for `astro check`), @fontsource/* (named), vitest 5 (named).
- Follow-ups: none.
- [HUMAN] open: none.

### S04 — CI and repository hygiene — 2026-09-25
- Done: `.github/workflows/ci.yml` (jobs `web`: corepack pnpm, Node from `.node-version`, frozen install, `biome ci`, Nx typecheck/test/build; `api`: toolchain from `rust-toolchain.toml`, rust-cache, sqlx-cli + cargo-deny via install-action, Supabase CLI 2.117 with only Postgres started, `supabase db reset`, fmt, clippy `-D warnings`, `cargo test` with `BEDA_TEST_DATABASE_URL`, `sqlx prepare --check`, offline release build, `cargo deny`), `codeql.yml` (JS/TS, Rust, Actions; build-mode none; weekly), `dependabot.yml` (npm, cargo, actions, docker for `apps/web`, `apps/api`, `deploy/backup`; minor/patch grouped), CODEOWNERS, PR and issue templates, `SECURITY.md`, `docs/repo-settings.md`. Top-level `permissions: contents: read`; `security-events: write` only in the CodeQL job; `persist-credentials: false` on checkout; every action pinned to a full SHA (resolved with `git ls-remote`, tag in a comment); no `pull_request_target`.
- Deviations from step/spec: CodeQL also scans the `actions` language (workflow injection checks). `sqlx-cli` has no prebuilt manifest in `taiki-e/install-action`, which falls back to `cargo-binstall` automatically.
- New deps: none (actions: checkout v7.0.1, setup-node v7.0.0, setup-rust-toolchain v2.0.0, rust-cache v2.9.2, install-action v2.87.20, supabase/setup-cli v3.0.1, codeql-action v4.38.2).
- Follow-ups: confirm CI is green on the first PR (not run yet: no PR opened in this session).
- [HUMAN] open: apply `docs/repo-settings.md` (branch protection with required checks `ci / web`, `ci / api`, CodeQL; secret scanning + push protection; first-time contributor approval; read-only Actions token).

### S05 — Container images and prod compose — 2026-09-25
- Done: `apps/api/Dockerfile` (cargo-chef planner/builder on `rust:1.94.1-alpine3.23`, static musl binary, `SQLX_OFFLINE=true`, `BEDA_BUILD_SHA` build arg, release profile `lto = "thin"`, `codegen-units = 1`, `strip`; final `distroless/static-debian12:nonroot`, entrypoint `beda-api`, cmd `serve`), `apps/web/Dockerfile` (`pnpm fetch` on the lockfile → offline install → `nx run web:build` → `pnpm deploy --prod`; final `node:24.21.0-alpine3.24`, user `node`, `node ./dist/server/entry.mjs`), root `.dockerignore` (keeps `.sqlx/`), `deploy/compose.yaml` (caddy, web, api, backup behind `profiles: [backup]`; only caddy publishes ports; healthchecks: `beda-api healthcheck` and a Node `fetch` one-liner; `json-file` 50m×5; `BEDA_ENV_FILE`), `deploy/Caddyfile` (site from `BEDA_SITE_ADDRESS`, `tls internal` via snippet when `BEDA_TLS_INTERNAL=1`), `deploy/.env.example`, `deploy/README.md`, Taskfile `prod:build`, `prod:up`, `prod:down`.
- Verified: `task prod:up` → all three containers healthy; `https://localhost/` 200 with HSTS, nosniff, referrer and permissions headers, zstd; `https://localhost/api/readyz` 200 against the local Supabase; `web` runs as `node` (uid 1000), `api` as `nonroot`; `caddy adapt` with `BEDA_TLS_INTERNAL=0` gives plain automatic HTTPS.
- Image sizes: api **3.3 MB** (content; 14 MB on disk incl. distroless layers), web **119 MB** (content; `node_modules` 203 MB unpacked — astro, vite and babel are runtime deps of the SSR server). API build: cold **4 m 22 s**, code-only change with the cached dependency layer **1 m 06 s** (4 vCPU).
- Deviations from step/spec: `pnpm deploy` + Nx instead of `turbo prune` (Nx repo). The web image bakes `BEDA_BASE_URL` at build time (Astro `site`). Compose adds `extra_hosts: host.docker.internal` to api for the local run. In this sandbox the images were built with base images that trust the egress proxy CA (passed via `--build-arg RUST_IMAGE/NODE_IMAGE`); the Dockerfiles themselves are unchanged.
- New deps: none (images: rust alpine, node alpine, distroless static, caddy 2.11.4-alpine; cargo-chef 0.1.78 inside the build stage).
- Follow-ups: consider trimming the web runtime (bundle the server with `vite ssr.noExternal`) if the image size matters.
- [HUMAN] open: none.
