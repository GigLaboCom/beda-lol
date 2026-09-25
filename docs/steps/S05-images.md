# S05 — Container images and prod compose

Stage 0 · Depends on: S04 · Medium

## Goal
Both apps build into small production images, and `deploy/compose.yaml` + `Caddyfile` run the whole stack locally over HTTPS on `localhost` exactly as it will run on the server.

## Read first
- Spec «Инфраструктура и хостинг» (services table, Caddyfile); `docs/08-amendments.md` (prod row)
- Nx docs: project graph, `nx build web`; pnpm docs: `pnpm deploy`

## Tasks
1. `apps/api/Dockerfile` (build context: repo root, because the Cargo workspace is there): `cargo-chef` pattern — `planner` stage (`cargo chef prepare`), `builder` stage on `rust:<pinned>-alpine` (`cargo chef cook --release` for cached deps, then `cargo build --release -p beda-api` with `SQLX_OFFLINE=true` and `BEDA_BUILD_SHA` from a build arg), producing a static musl binary; release profile with `lto = "thin"`, `codegen-units = 1`, `strip = true`. Final `gcr.io/distroless/static-debian12:nonroot` (or current distroless static), entrypoint `beda-api`, default cmd `serve`. `rustls` everywhere, no OpenSSL.
2. `apps/web/Dockerfile`: multi-stage: install the workspace with the frozen lockfile, `pnpm nx build web`, then `pnpm deploy --filter web --prod` to get production deps only (Nx replaces `turbo prune`); install with frozen lockfile; build; final `node:<LTS>-alpine` with only `dist/` and production deps; non-root user; `CMD ["node","./dist/server/entry.mjs"]`; `HOST=0.0.0.0`, `PORT=4321`.
3. `.dockerignore` at root: node_modules, dist, target, .git, archive, docs, coverage, *.env (keep `.sqlx/`).
4. `deploy/compose.yaml` (prod): services `caddy`, `web`, `api`, `backup` (backup image and script come in S06 — define the service with `profiles: ["backup"]` for now). **No Postgres service** — the database is Supabase (amendment П-1); `BEDA_DATABASE_URL` points at the Supabase project. For `task prod:up` locally, point it at the local Supabase stack. Images `ghcr.io/giglabocom/beda-web:${BEDA_TAG}` and `ghcr.io/giglabocom/beda-api:${BEDA_TAG}`. Only `caddy` publishes ports. `env_file: /opt/beda/.env` in prod; overridable path via `BEDA_ENV_FILE`. Healthchecks: api `readyz` via a tiny `beda-api healthcheck` subcommand (distroless has no curl — add the subcommand), web via Node one-liner. `restart: unless-stopped`. Logging `json-file` with `max-size: 50m`, `max-file: "5"`.
5. `deploy/Caddyfile` from the spec, with the site address taken from `{$BEDA_SITE_ADDRESS}` so the same file serves `beda.lol` in prod and `localhost` locally (`tls internal` when `BEDA_TLS_INTERNAL=1` — use a Caddy snippet or two site blocks; keep it readable).
6. `deploy/.env.example`: every variable the stack reads, with comments; no values that look like secrets.
7. Taskfile: `prod:build` (builds both images tagged `local`), `prod:up` (runs compose with `BEDA_TAG=local`, `BEDA_SITE_ADDRESS=localhost`, local env file), `prod:down`.
8. `deploy/README.md`: how the stack is wired, which env vars point at Supabase, and that migrations are applied with the Supabase CLI (S06), not by the api container.

## Out of scope
No server, no registry push, no deploy workflow (S06).

## Verify
- `task prod:build && task prod:up` → https://localhost shows the placeholder (accept Caddy's local CA), `https://localhost/api/readyz` 200.
- `docker images` shows the api image well under 30 MB and the web image reasonably small (report sizes and the cold vs cached api build times in PROGRESS).
- Containers run as non-root (`docker compose exec web id`).

## Done when
- [ ] Two Dockerfiles, `.dockerignore`
- [ ] Prod compose + Caddyfile work locally over HTTPS
- [ ] Healthchecks green
- [ ] PROGRESS.md updated with image sizes
