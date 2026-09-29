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
- [x] S07 packages/core
- [x] S08 packages/transom
- [x] S09 Home page
- [x] S10 Ship inspection quiz and result page
- [x] S11 Name game page
- [x] S12 Six pillar articles
- [x] S13 Share images
- [ ] S14 SEO baseline and stage 1 launch

## Stage 1b — Falls and puns
- [x] S00a Import the falls / puns / gamification bundle
- [x] S08a Spike: SVG glyph pipeline (no commit; findings in the plan pack)
- [x] S08b Glyph data and break table
- [x] S08c Transom v2: SVG renderer and controller with falls and breaks
- [x] S13a Share images on the shared transom renderer
- [x] S08d Pun catalogue in core and the /dev/falls bench (English copy review, D7, still open)
- [ ] S11a Name game with letter breaks (English word list awaits the human)
- [ ] S14a Pun plaques and easter eggs (the breaking logo waits for a design decision)
- [ ] S09a English word on the transom (option A in place with a provisional word; D2 and the native-speaker check await the human)
- [x] R1 ROADMAP: gamification and falls mapped into stages 2–6

## Stage 2 — Accounts and tracker
- [x] S16 Supabase Auth wiring
- [ ] S17 GitHub provider, plus Google and X (repo part done; the OAuth apps await the human)
- [ ] S18 Magic link (repo part done; SMTP, the sending domain and the Turnstile widget await the human)
- [ ] S19 Login UI and cabinet (repo part done; the production secret key and a joint check await the human)

## Stages 2–6
See `ROADMAP.md`. Expand each into a step file before starting it (S16–S19 ran from their ROADMAP lines, by the human's decision).

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

### S06 — Server, deploy workflow, backups — 2026-09-25 (repo part done; not ticked until [HUMAN] items and the live checks are done)
- Done: `deploy/SERVER-SETUP.md` (OS, firewall, key-only SSH, Docker, user `deploy`, `/opt/beda`, hand-made `.env`, forced-command key, DNS incl. CAA, GitHub environment, public GHCR packages, first start, backup drill); `deploy/scripts/deploy.sh` (SHA validation → exit 2, `flock`, checkout of the release's compose files, pull/up of api, web, backup, 60 s health poll, rollback to `.last_good`, timestamped log); `deploy/backup/Dockerfile` (alpine 3.23, postgresql17-client, age, rclone, supercronic, tini, non-root) + `crontab` (02:15 UTC); `deploy/scripts/backup.sh` (`pg_dump -Fc` of `app` + `auth` → age → rclone, prune 14 daily / 8 weekly / 6 monthly); `deploy/scripts/restore.sh` (throwaway Postgres 17 container, decrypt with a key given at runtime, `pg_restore`, per-table counts and latest `created_at`); **`.github/workflows/images.yml`** — builds and publishes `ghcr.io/giglabocom/beda-{api,web,backup}` (PR: build only; after green `ci` on `main`: push `:<sha>` + `:main`; tags `v*`: semver; Buildx + GHA cache per image, SBOM + provenance); **`.github/workflows/deploy.yml`** — `workflow_run` of `images` on `main` (or `workflow_dispatch` with a SHA): `migrate` job (`supabase link` + `db push`) then `deploy` job (`ssh deploy@$DEPLOY_HOST <sha>`), `environment: production`, `concurrency: production` without cancel; shellcheck in `ci.yml` and `task check`; `backup` service no longer behind a profile.
- Verified locally: shellcheck and actionlint clean; `deploy.sh` exits 2 for an empty, uppercase or injected SHA; retention picks the right files on a synthetic list; **backup + restore drill against the local Supabase**: dump 106 kB encrypted, uploaded to an rclone remote, pruned; restore into a throwaway Postgres 17 — 0 pg_restore errors, `app.quiz_attempts` 1 row with its `created_at`, `auth.schema_migrations` 77 rows. (The backup image itself could not be built here: the Alpine package CDN is blocked by this sandbox's egress policy, so the scripts ran in `postgres:17-alpine` with `age`/`rclone` built from source. CI builds the image.)
- Deviations from step/spec: `.env` on the server is maintained by hand (forced-command key cannot write it), as the step anticipated. Image build/publish is a separate `images.yml` (asked by the human) chained `ci → images → deploy` via `workflow_run` instead of one `deploy.yml`; deploy only runs for images built from a green `main`. The forced command points at `/opt/beda/src/deploy/scripts/deploy.sh` (a read-only clone that the script moves to each release; the body runs from a fully parsed `main()` so the self-update is safe). The backup image is also deployed on each release.
- New deps: none in code. Actions: docker/setup-buildx-action v4.4.1, docker/login-action v4.6.0, docker/metadata-action v6.2.0, docker/build-push-action v7.4.0 (all SHA-pinned).
- Follow-ups: the break-on-purpose rollback test and the first real nightly restore report need the server.
- [HUMAN] open: rent the VPS and follow `deploy/SERVER-SETUP.md`; DNS for `beda.lol`; environment `production` with secrets `DEPLOY_SSH_KEY`, `SSH_KNOWN_HOSTS`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and variables `DEPLOY_HOST`, `SUPABASE_PROJECT_REF`; Supabase project on a paid plan + `beda_api` password; bucket + `age` key pair; make the three GHCR packages public after the first `images` run on `main`.

### S07 — packages/core — 2026-09-25
- Done: `@beda/core` (ESM TS source, strict, no runtime deps): `letters`, `quiz` (questions, `liveNails`, `scores`, `finalNails`, `classify` with the П+О case first, `ACTS`, `pickActions`), `result-code` (codec, strict `decode`, `allCodes`), `share`, `namer` (`normalizeName`, `FUNNY`, `STOP`, `findRemoval`, `fallenLetters` with proper Russian plurals, `verdict`), `tracker` (`STEPS`, `nailState`). Shared fixture `fixtures/result-codes.json` for the Rust validator (S10). 57 Vitest tests; coverage 100 % lines on `quiz.ts`, `result-code.ts`, `namer.ts` (thresholds enforced at 90 %).
- Deviations from step/spec: `normalizeName` trims again after cutting to 14 (no trailing space). `fallenLetters` uses full Russian plural rules (21 → «отвалившаяся буква»), identical to the prototype for 1–14. The prototype's stop-list fallback cannot actually avoid a stop word (the remainder is a suffix); behaviour kept, documented in the README.
- New deps: `@vitest/coverage-v8` (coverage threshold required by the step), `@types/node` (tests read the fixture).
- Follow-ups: improve the stop-list fallback (e.g. drop letters from the end) — needs a product decision.
- [HUMAN] open: none.

### S08 — packages/transom — 2026-09-25
- Done: `@beda/transom`: `transom.css` (prototype CSS, em-based, tokens only), `mounts.ts` (`MOUNTS`, `DEFAULT_MOUNT`, deterministic fall offsets), `render.ts` (`renderTransom` → prototype DOM with state applied, escaping, `role="img"`, Russian `aria-label`), `client.ts` (`attachTransom` → `set(nails, { animate })`, no rebuild), `Transom.astro`. 12 Vitest + happy-dom tests. Home uses the package (the temporary `StaticTransom` is gone). Visual check page `/dev/transom` (noindex, not linked): all П/О combinations for 4/1/0 nails, a long Latin name, an animation button.
- Verified: screenshots at 1280 and 375 px — hanging П ≈ 37°, О toppled clockwise ≈ 124° around its lower-left rivet, fallen letters on the shelf, no horizontal scroll; with JavaScript disabled the nine hanging/fallen states render the same; animation П → 1, О → 0 ends in `Надпись на транце: П пусто БЕДА`.
- Deviations from step/spec: the swing keyframes run under an extra `.swinging` class that the client adds only when a letter starts hanging (the prototype re-triggered the swing whenever `.still` was removed, and server-rendered hanging letters would swing on load). The aria-label reads runs of letters as words («П пусто БЕДА» instead of «Ппусто БЕДА»). Fixed a specificity gap so `.still` also stops a running swing.
- New deps: `happy-dom` (named in the step).
- Follow-ups: glyph-ink snapping (docs/05-site.md §10) stays for later.
- [HUMAN] open: none.

### S09 — Home page — 2026-09-25
- Done: `/` ported from the prototype as static HTML: `components/home/` `Hero` (package transom + a tiny module script: П → 1 nail at 0.9 s, О → 0 at 3.9 s, final state at once under reduced motion), `NamerTeaser` (GET form to `/kak-nazovesh?name=…`), `Pillars` (from `@beda/core` `PILLARS`), `Moorings`, `LogTeaser` (journal SVG with token colours), `TriangleTeaser`; all copy in `i18n/ru.ts` with the prototype's wording and bracketed placeholders. Header nav now lists only existing routes (`/osmotr`, `/kak-nazovesh`, `/bukvy`, `/#harbor`, `/#journal`); footer links whose URL is still a placeholder render as text.
- Verified: screenshots at 375, 768 and 1280 px match the prototype layout; no horizontal scroll at any width; page JS **1.1 KB gzip** (hero script 272 B + transom controller 832 B; no Preact on the home page); `astro check` clean.
- Deviations from step/spec: moorings for the tracker, the author's log and the Bermuda triangle are «скоро» cards, not links (their routes arrive in later stages) — no dead links; «Оставить эпитафию», «Поднять со дна» and «Весь журнал» are shown as inactive for the same reason. Tokens `--sea-wave` and `--mast` added for the journal SVG. Pillar names hyphenate so «Позиционирование» fits the 6-column grid.
- New deps: none.
- Follow-ups: replace `[ссылка на канал]` / `[контакт]` in `ru.ts` with real URLs.
- [HUMAN] open: none.

### S10 — Ship inspection quiz and result page — 2026-09-25
- Done: `/osmotr` (prerendered) with the Preact island `QuizIsland` (`client:load`): question card, Да / Частично / Нет, back, progress bar (`role="progressbar"`), live transom via `attachTransom` over server-rendered markup; logic from `@beda/core` (new pure `quiz-session.ts` reducer + `parseSession`/`resumeSession`, `scoresFromStates`). Answers live in sessionStorage (guarded); coming back from the result resumes on question 12; `?restart=1` clears. On the 12th answer: result code → reveal flag → fire-and-forget `POST /api/quiz/attempts` (`sendBeacon`, fallback `fetch` keepalive) → `/osmotr/r/<code>`. `/osmotr/r/[code]` (`prerender = false`): strict `decode`, invalid → 404 page with status 404; `noindex, follow`; canonical `/osmotr`; OG + Twitter tags pointing at `/og/osmotr/<code>.png` (1200×630, alt); SSR transom in the final state, class, six chips, share text, `CopyLink` island (Clipboard API, visible status), «Пройти заново», actions; reveal 500 + 520·i ms only when coming from the quiz; «Прибить буквы обратно» behind `TRACKER_ENABLED = false`. 404 page (`NotFound` component). API: `POST /api/quiz/attempts` — body `{ code, source? }` with `deny_unknown_fields`, strict code parser (Rust port, `domain/result_code.rs`, plus `classify` so `class` is stored), `source` slug check, `governor` 10/min per IP (last `X-Forwarded-For` entry, else peer address; idle keys pruned every minute), JSON rejections in the error shape, 204.
- Tests: core reducer/session tests (70 total in core); Rust `result_code` tests read the shared `packages/core/fixtures/result-codes.json` (same file as Vitest); handler tests for invalid codes, unknown fields, bad JSON/content type, 429 after ten requests per IP, and an end-to-end insert against the local Supabase.
- Verified in a browser (Playwright): full pass with a back step mid-quiz; redirect to `/osmotr/r/002222`; reveal animation; `app.quiz_attempts` row `{0,0,2,2,2,2}`, `beda-po`, source `test`; going back resumes at «вопрос 12 из 12»; the shared link in a fresh context renders the final state with no animation; no console errors; 375 px quiz without horizontal scroll. `/osmotr/r/003212` and `/osmotr/r/00221` → 404.
- Deviations from step/spec: the privacy line under the answers now says «ответы не отправляются — только итог, анонимно» (the prototype's «ответы никуда не отправляются» would be false once the attempt is recorded). Result pages pick actions from the code's states (fallen, then hanging) because shared links carry no scores, so a letter with 3 nails (score 1.5) is not suggested and the list can be shorter than three. Invalid codes render the 404 component in place (Astro forbids rewriting an on-demand route to the prerendered 404). `?from=<slug>` on `/osmotr` becomes the attempt's `source`.
- New deps: `governor` (named in the step; default features minus `jitter`).
- Follow-ups: none.
- [HUMAN] open: none.

### S11 — Name game page — 2026-09-25
- Done: `/kak-nazovesh` (prerendered, indexable, title «Как назовёшь — что останется от названия проекта») with the Preact island `NamerIsland` (`client:visible`): labelled input (max 14), «Спустить на воду», result area with `aria-live="polite"`; transom sized like the prototype (`min(64, max(20, avail / (n·0.85 + 0.8)))` px, recomputed on resize), all nails → removed letters fall after 450 ms (instantly under reduced motion), verdict «Было / Стало» + line from `@beda/core`. `?name=` is read on load (the home teaser posts there) and written with `history.replaceState` on submit. API: `POST /api/events` — event is a serde enum (adjacently tagged `name`/`props`, `deny_unknown_fields` on both levels), only `namer_played { found: bool }` exists; stored in `app.events` via `query_scalar!` (`.sqlx` regenerated); 10/min per IP. Rate limiting moved into a per-route middleware in front of body parsing (so malformed requests count too) for both write endpoints.
- Verified: `?name=Багтрекер` → «Стало: БАГ», six letters fall; ПОБЕДА → БЕДА, DEADLINE → DEAD, «таск менеджер» → АД, «трекер» → ЕКЕР; URL updates; 375 and 1280 px without horizontal scroll; `app.events` holds only `{"found": true|false}` (no name, no user or anon id); API tests for unknown events, extra props (e.g. a `name` field), wrong types, rate limit and an end-to-end insert.
- Deviations from step/spec: none beyond the shared rate-limit middleware.
- New deps: none.
- Follow-ups: none.
- [HUMAN] open: none.

### S12 — Six pillar articles — 2026-09-25 (ticked for the code; the texts wait for the human)
- Done: content collection `pillars` (`src/content.config.ts`, glob loader, Zod schema: `letter`, `slug`, `title`, `description`, `order`, `draft`); six Russian drafts (524–606 words each, all `draft: true`): what the pillar is, how it falls off in pet projects, excuses that keep it on the shelf, the two quiz questions, four first nails (wording from `STEPS`/`ACTS`), a closing link to `/osmotr`. No statistics, studies, quotes or cartoon references. `/bukvy/[slug]` (prerendered): breadcrumbs, transom with only this letter highlighted (new `highlight` option in `@beda/transom`, other letters dimmed), article, CTA to the quiz (`?from=bukvy`), prev/next letters (`rel=prev/next`), JSON-LD `Article` + `BreadcrumbList`, OG tags pointing at `/og/bukvy/<slug>.png` (S13). `/bukvy` index with the six descriptions + `BreadcrumbList`. Home pillar cards now link to the articles.
- Verified: all seven pages build and pass `astro check`; titles and descriptions are unique; every draft page (and the index while all articles are drafts) carries `noindex, follow`; 375 and 1280 px without horizontal scroll.
- Deviations from step/spec: the `/bukvy` index is also `noindex` while every article is a draft. Sitemap exclusion of drafts is implemented with the sitemap in S14.
- New deps: none.
- Follow-ups: none.
- [HUMAN] open: read and edit the six drafts in `apps/web/src/content/pillars/` in your voice; set `draft: false` when happy.

### S13 — Share images (729 prebuilt) — 2026-09-25
- Done: `apps/web/scripts/og.ts` (run with `tsx`): the ShareCard layout as a satori element tree — transom drawn with the site's geometry and `MOUNTS` (ghost letters, brass letters on the board / hanging on the hinge / fallen on the shelf, nails and holes), kicker «ОСМОТР СУДНА», «У меня — <класс>», «ПО есть. Победы нет. А у тебя?», `beda.lol`; SVG → PNG with resvg, then a palette PNG via sharp. Outputs `public/og/osmotr/<code>.png` (all 729 from `allCodes()`), `public/og/default.png` and `public/og/bukvy/<slug>.png`. Nx target `web:og` (inputs: the script, pillar Markdown, `@beda/core` sources, transom mounts, the tokens package, the lockfile; output `public/og`) and `web:build` depends on it — cached, re-rendered only when an input changes. OG tags moved into `Base.astro` (every page gets `og:*` + `twitter:card`, `og:image:width/height/alt`; default image `/og/default.png`); result and article pages pass their own image. CI caches `.nx/cache` with `actions/cache`; the web Dockerfile keeps the Nx cache in a BuildKit cache mount. `public/og/` is git-ignored (generated).
- Spike: `222222`, `002222`, `112020` rendered correctly with satori transforms (`rotate` + `transformOrigin` at the hinge, `translate` + `rotate` for fallen letters) — **kept CSS transforms, no SVG `<text>` fallback needed**. One pitfall: satori does not merge same-named fonts, so Fontsource's Latin and Cyrillic subsets are registered under separate names and listed together in `fontFamily`.
- Numbers: 729 + 7 images, **11.5 MB** total (palette PNG); generation **98–111 s** locally with four renders in flight (≈ 90 s inside the Docker build); a cached `nx run web:build` takes 0.9 s. CI adds about 1.5–2 minutes to the first web build and ~0 when the Nx cache hits. Web image 130 MB (was 119 MB).
- Deviations from step/spec: images are palette PNGs from the start (size was never close to 50 MB, but the palette keeps each file ≈ 16 KB). `tsx` runs the script (Node cannot load the workspace's extension-less TS imports directly).
- New deps: `satori`, `@resvg/resvg-js` (named in the step), `sharp` (palette PNG), `tsx` (runs the TS script) — dev dependencies of `web`.
- Follow-ups: none.
- [HUMAN] open: paste a result link (e.g. `https://beda.lol/osmotr/r/002222`) into Telegram and one more messenger after launch and check the preview.

### S14 — SEO baseline and stage 1 launch — 2026-09-25 (repo part done; not ticked until the site is live)
- Done: `@astrojs/sitemap` → `/sitemap-index.xml` for prerendered pages, excluding `/dev/*`, result pages, `/404` and draft articles (read from the pillar frontmatter in `astro.config.mjs`; `/bukvy` too while every article is a draft). `public/robots.txt` (disallows `/api/`, `/admin/`, `/kabinet`, `/moya-yahta`, `/dev/`, `/osmotr/r/`; sitemap link). Trailing-slash policy **never** (`trailingSlash: 'never'`; the Node server answers `/x/` with 301 → `/x`, so Caddy needs no rule). Canonical on every page from the layout. JSON-LD: `WebSite` on `/`, `Article` + `BreadcrumbList` on articles, `BreadcrumbList` on `/bukvy`, `/osmotr`, `/kak-nazovesh`. 404 page with links home and to the quiz (S10). Only the display face (Playfair Display 900 Cyrillic) is preloaded (`@beda/tokens/preload`); favicon added. **CSP** through Astro's `security.csp` (hashes for its scripts and styles; `default-src 'self'`, `object-src 'none'`, `base-uri`/`form-action 'self'`) — delivered as a header on SSR pages and a `<meta>` on prerendered ones. To make it work the transom no longer renders inline `style` attributes: positions come from the generated `packages/transom/src/mounts.css` (a test keeps it in sync with `MOUNTS`), and the quiz progress bar has no SSR style. IndexNow key route `/<key>.txt` (key from `BEDA_INDEXNOW_KEY`, 404 otherwise). `.github/workflows/weekly.yml` + `.github/lighthouserc.json`: Lighthouse CI (pinned `treosh/lighthouse-ci-action`) on `/`, `/osmotr`, one article, weekly; performance ≥ 90 and accessibility ≥ 95 as errors. README status and ROADMAP «Learned in stage 1» updated.
- Verified locally (built Node server): no CSP violations in the browser on `/`, `/osmotr` (answering), `/kak-nazovesh?name=…`, `/osmotr/r/112020`, an article; hero animation, islands and reveal still run. Lighthouse (local, mobile default): `/` perf 96 / a11y 100 / best practices 100 / SEO 100, LCP 2.3 s, CLS 0; `/osmotr` 100 / 100, LCP 1.2 s; article 98 / 100 (SEO 66 only because drafts are `noindex`); `/kak-nazovesh` 100 / 100, CLS 0.033. `curl`: `/bukvy/` → 301 `/bukvy`, `robots.txt` 200, `sitemap-index.xml` 200 listing `/`, `/osmotr`, `/kak-nazovesh`.
- Deviations from step/spec: result pages are also disallowed in robots.txt (they are `noindex` anyway). The production checks (`curl -I https://beda.lol/`, Lighthouse on production, Rich Results Test) wait for the server.
- New deps: `@astrojs/sitemap` (named in the step), `tsx` in `@beda/transom` (generates `mounts.css`).
- Follow-ups: none.
- [HUMAN] open: add the site to Google Search Console and Yandex Webmaster (DNS TXT), submit `/sitemap-index.xml`; flip `draft: false` on approved articles (S12); announce stage 1; the S06 server items.

### i18n — en/ru bilingual support (out of step) — 2026-09-28
- Ask: add en/ru language support, modelled on the lookbook site (`landing-pages`): `i18n/config.ts` + `i18n/index.ts` helpers, per-locale dictionaries, `prefixDefaultLocale: false`, locale-prefixed page files, `<html lang>` + hreflang in the layout. Scope chosen by the human: full plumbing + **all UI strings translated**; long-form pillar articles stay Russian (English shows a marked stub). **Share/OG images are on hold** (not translated) — both locales reuse the Russian cards.
- Done:
  - `apps/web/src/i18n/`: `config.ts` (defaultLocale `ru`, locales `['ru','en']`, labels, `ogLocale`, `htmlLang`), `ui.ts` (full `ru` + `en` dictionaries, `Key` from `ru`, en typed `Record<Key,string>` so missing keys fail the build), `index.ts` (`getLangFromUrl`, `useTranslations`, `getLocalizedPath`, `stripLocale`, `fmt`, `isPlaceholder`). Old `i18n/ru.ts` removed. Components read the locale from `Astro.url`, so `t('key')` call sites are unchanged — only file headers.
  - Astro `i18n` block + `@astrojs/sitemap` `i18n` option (emits `xhtml:link` alternates); `inSitemap` filter matches locale-stripped paths and drops `/en/bukvy/*` stubs.
  - `Base.astro`: dynamic `<html lang>`, `og:locale`, `hreflang` alternates (+ `x-default` → ru), `alternates` prop to opt out on one-locale pages. `SiteHeader` gets a RU/EN switcher and localised nav; `SiteFooter`, `NotFound`, `404` localised.
  - Page bodies extracted to `components/pages/` (`HomePage`, `OsmotrIntro`, `NamerGame`, `LettersIndex`, `PillarArticle`, `ResultView`); thin `pages/*` and `pages/en/*` wrappers render them. `/en` routes: home, osmotr, kak-nazovesh, bukvy index, bukvy/[slug] (stub, noindex), osmotr/r/[code] (SSR).
  - `packages/core` made locale-aware **additively** (ru stays the default → all existing tests pass): `locale.ts` (`Locale`), `getPillars`/`getQuestions`/`getClasses`(via `classify(nails, locale)`)/`getSteps`, `pickActions(scores, locale)`, `verdict(...,locale)`, `fallenLetters(k,locale)`, `shareText(states,locale)`; English values provided. `packages/transom`: `transomLabel` takes wording (`RU_LABEL_TEXT`/`EN_LABEL_TEXT`), `renderTransom` writes it to `data-label-*`, `attachTransom` reads it back so the aria-label stays correct after motion; `Transom.astro` gains a `lang` prop. Islands (`QuizIsland`, `NamerIsland`, `CopyLink`) take a `lang` prop.
- Verified: `astro check` 0/0/0, `biome check` clean, `vitest` 95/95, full `astro build` (all `/en` routes prerender, result pages stay SSR, sitemap with hreflang). Runtime SSR checked: `/osmotr/r/<code>` and `/en/osmotr/r/<code>` render in the right language (transom keeps Cyrillic «БЕДА»); en pages carry `lang="en"`, `og:locale=en_US`, canonical `/en/...`, and the switcher.
- Deviations: English pillar **article bodies** are stubs (link back to the Russian article), per the chosen scope. OG images not translated (on hold). The ПОБЕДА pun is explained in English rather than re-punned ("PO + BEDA = POBEDA…").
- Follow-ups: translate the six pillar articles to English and drop the stub; decide the English share-image story (`apps/web/scripts/og.ts`) when images come off hold; consider a locale cookie / `Accept-Language` redirect if desired.
- [HUMAN] open: review the English UI copy in `apps/web/src/i18n/ui.ts` (and the English product copy in `packages/core`) for voice; decide whether `/en` should be linked/announced now.

### Brand icons — favicon / app icons / manifest (out of step) — 2026-09-28
- Ask: new icon (`4c-rivets-rust.svg`), full icon set with a web app manifest as in mnemoria-web, generator runnable from the repo root (future branding work lives there too); drop the old favicon.
- Done: new package `packages/brand` (`@beda/brand`): `src/tile.svg` (the source), `src/tile.ts` (parses it and derives rounded / square / maskable / bare / mono variants), `src/icons.ts` (what is generated and linked; brand colours = `--tar` / `--brass`), `scripts/generate-icons.ts` (sharp → `apps/web/public/`: `favicon.svg`, `favicon.ico` 16/32/48, `favicon-*` 16–512, `android-chrome-*` 36–512, `maskable-icon-*` 192/512, `apple-touch-icon*` 152/167/180, `mstile-*` + `browserconfig.xml`, `safari-pinned-tab.svg`, `logo.svg`). Output committed. `Base.astro` renders `headLinks` / `headMeta` (icons, apple-touch, mask-icon, manifest, `theme-color` per scheme, msapplication). `/manifest.webmanifest` is a prerendered endpoint (name/description from the ru dictionary). Commands: `task brand:icons`, `pnpm brand:icons`.
- Tests: `@beda/brand` — every linked file exists, PNG sizes match, SVG outputs and browserconfig are up to date with the source, brand colours match `tokens.css` and the artwork; parser/variant unit tests.
- Deviations: the served SVGs drop the source's `<metadata>` (a C2PA provenance manifest, ≈ 7 KB); `src/tile.svg` keeps it. `packages/brand/src/*.svg` is excluded from Biome (the a11y rule misreads the title after `<metadata>`).
- New deps: none new to the repo — `sharp`, `tsx` (same versions as in `web`) as dev deps of `@beda/brand`.
- Follow-ups: OG/share art from the same package when branding continues.

### S00a — Import the falls / puns / gamification bundle — 2026-09-28
- Done: new reference material from the `yacht-beda` bundle moved to its permanent place. `docs/09-transom-falls-component.md`; `docs/tactics/09-gamification.md`, `10-otval-katalog.md`, `11-yazyki.md`; `archive/src/transom-falls.html`; `archive/design/icon/`, `archive/design/puns/`, `archive/tools/pun-search/`. Existing files merged: `docs/04-changelog.md` (f1–f5), `docs/tactics/00-concept.md` («См. также»), `archive/README.md` (tree and status rows, artifact link). Imported texts point at repo paths (`archive/src/…`, `docs/tactics/…`, `archive/design/…`, `archive/tools/…`). `CLAUDE.md` "Sources of truth" lists the falls prototype, doc 09 and the pun catalogue.
- Deviations: step file lives in `docs/scratch/1111/steps/` (plan pack 1111, not committed by the human's choice). Superseded facts are marked, not rewritten: the domain is decided (`beda.lol`), `/en` is done, and the shipped icon is `4c` (the bundle recommended `4a`). Doc 09 §8 says the repo keeps one engine: no CSS-only transom next to it, and geometry is generated from the font. BEST LAUNCH → PEST LUNCH moved to «Отбраковано» because it rests on LAUNCH → LUNCH, which the author rejected (D2 recommendation). One location hint in `11-yazyki.md` was reworded. The bundle's own `HANDOFF.md` is not imported (personal info, private links), and neither is its `claude-code/` kit (older than the repo). `archive/tools/pun-search/*.py` are kept verbatim, bundle paths included; the README says so.
- New deps: none.
- Follow-ups: S08a spike (SVG glyph pipeline), then S08b–S08d, S13a, S11a, S14a; R1 (gamification into ROADMAP) any time.
- [HUMAN] open: D2 (English board word, native-speaker check), D6 (namer charset), D7 (English gag copy) — see the plan pack.

### S08b — Glyph data and break table — 2026-09-28
- Done:
  - `@beda/core`: `breaks.ts` (19 catalogue breaks, no M>N; `BreakKey`, `breakFrom`/`breakTo`/`breaksFor`/`isBreakKey`, `Op`, `applyOps`, `validateOps`) and the generated `charset.gen.ts` (`BOARD_CHARSET`, 295 characters; `FALLING`, 210 letters and digits).
  - `@beda/transom`:
    - `glyphs.config.ts` holds every generator input: font files, family and weight, charset rules, core set, px/em, alpha thresholds, rivet letters, hinge overrides (none, D9), fixed-glyph nail sizes;
    - `pieces.ts`, `geometry.ts` (board sizes, drop formulas, `fallX`/`fallRotation` moved here from `mounts.ts`, piece drift and tumble), `timeline.ts`, `glyph-analysis.ts`, `glyphs.ts` (`glyphFor`, `needsExt`, `loadExt`);
    - generator `scripts/gen-glyphs.ts` + `scripts/glyphs-build.ts`;
    - committed output `src/glyphs.core.gen.ts` and `src/glyphs.ext.gen.ts`.
  - Wiring: `pnpm --filter @beda/transom gen` runs both generators; Nx target `gen` with inputs and outputs; `task transom:glyphs`; `task gen` runs it and `task gen:check` diffs it. In CI the freshness test in `glyphs.test.ts` fails on stale output (the web job runs `nx test`), so `.github/` is unchanged. `*.gen.ts` is excluded from Biome.
  - `/dev/animacii` is committed and reads the generated tables, geometry and timeline, with no scratch files. It shows all 210 falling characters, 19 breaks and a new section with the 85 fixed characters and their nails. The "как сейчас (MOUNTS)" variant stays until S08c.
- Sizes: `glyphs.core.gen.ts` 80.5 KB raw / 24.8 KB gzip (106 characters, all 19 breaks); `glyphs.ext.gen.ts` 156.5 KB / 39.1 KB (189 characters); `charset.gen.ts` 1.3 KB / 0.8 KB. The S08a estimate was about 20 + 33 KB for paths only; nails, centroids and breaks add the rest. Client bundles are unchanged, because nothing loads the tables yet.
- Verified:
  - tests: core 112, transom 82;
  - hang references ±1°: the largest gap is B>P at +0.7°;
  - exact vs raster centroid within 0.0001 em;
  - `astro check`, Biome, typecheck and the build of every TS project pass;
  - `/dev/animacii` in Chromium, Firefox and WebKit: no errors, paint layers in order, 232 hanging states with the centroid on the plumb line within 0.05 px.
  - `task` is not installed in this container, so its parts ran directly. Rust is unchanged.
- Deviations:
  - **Raster:** the analysis rasterises the outline itself (non-zero winding, 16 sub-scanlines, exact horizontal coverage, pure JS) instead of resvg. The freshness test must be byte-identical on the arm64 dev container and the x64 CI runner, and resvg is a native prebuilt per platform. The result agrees with the S08a resvg references (above), and `@beda/transom` has one dev dependency fewer.
  - **Break masks fixed** (`pieces.ts`, G>C, E>L, E>F, Т>Г, Й>И, Б>Ь, П>Г, Ы>Ь): the prototype masks cut through serifs and left crumbs of 17–236 raster px on the board, and remainder nails snapped onto them. The human saw the Ы>Ь case: the rivets of the stem stayed when Ы became Ь. The masks now have notches, so each crumb goes with its piece, and a test requires every remainder to be one connected region. Т>Г changed the most: its hinge sat on a crumb of the bar's serif (68.4°), and now sits on the bar at the cut (20.7°). The test reference moved with it.
  - Nails are stored as integers, and the piece test runs on the stored point, so a rounded nail never lands inside its piece.
  - Swing duration is 2.6 s (was 2.8 s in `transom.css`): one value from `timeline.ts`, and a test keeps `transom.css` in step until S08c generates it.
- New deps (dev, `@beda/transom`, already in the lockfile): `fontkitten` 1.0.3 (font parser, chosen in S08a) and `@fontsource/playfair-display` 5.3.0 (the font files, same version as `@beda/tokens`). `@beda/core` is a workspace dependency of `@beda/transom` (`BreakKey`).
- Follow-ups: S08c (renderer and controller on the tables, generated CSS, `MOUNTS` removed; tune the drop formula against the shelf); S13a; S08d; S11a (namer normaliser on `BOARD_CHARSET`).
- [HUMAN] open: check the notched breaks on `/dev/animacii` (Ы>Ь, Т>Г, П>Г, E>F and the rest).
- Closed 2026-09-28: the human checked the notched breaks on `/dev/animacii`.

### S08c — Transom v2: SVG renderer and controller — 2026-09-28
- Done:
  - `@beda/transom` renders every board as SVG from the generated glyph data (`render.ts`):
    - board-wide paint layers (imprints, holes, letters, pieces, nails, debug) with one slot wrapper per layer;
    - nested hinge groups, a remainder clipped by an even-odd path and the piece by its polygon;
    - the final state in `transform` attributes, so it works without JS or CSS and in resvg;
    - slot width = glyph advance;
    - `boardWidthEm`, `BOARD_HEIGHT_EM`, `fitSize` (replaces the namer's `transomSize`);
    - ids prefixed per board; `highlight`/`dim` and `.nail.iron` kept; colours by class from the tokens.
  - State model (`state.ts`): `SlotState { nails, broken }`, `BoardState` with `breaks`, `fromNails`, `fromOps`, `finalOf`. `transomLabel(state)` reads a broken letter as the letter it became.
  - Controller (`client.ts`):
    - `set(state | nails)`, backward compatible for the quiz;
    - `play(ops, { k, onDone })` on the doc-09 timeline from `timeline.ts`;
    - `reset()`, `finalState()`, `debug(on)`, `destroy()`;
    - timers are cleared on reset and when the board leaves the page; reduced motion jumps to the end; the aria-label is updated at the end.
  - Call sites migrated:
    - Hero and ResultView attach to SSR markup, with their choreography times now in `TIMELINE`;
    - the hero's story is `HERO_STEPS` in `@beda/core`;
    - QuizIsland gets the board as a server-rendered child (slot), so the quiz ships no glyph data;
    - NamerIsland renders on the client with `fitSize` and calls `loadExt()` only when a name needs it;
    - PillarArticle is unchanged (SSR highlight);
    - `og.ts` reads nails, hang and drop from `glyphFor` (a small adapter until S13a).
  - `MOUNTS`, `mounts.ts`, `mounts.css`, `mounts.test.ts` and `scripts/gen-css.ts` are deleted, with no shims.
  - `/dev/transom` has the state grid, the long Latin name, break examples (Д>Л, Т>Г, B>P) and a debug toggle. `/dev/animacii` is rebuilt on `renderTransom` + `attachTransom`, so the bench checks the engine itself; the MOUNTS variant is gone.
  - `call-sites.test.ts`: no ПОБЕДА/БЕДА literals in `apps/web/src/components`, only public `@beda/transom` entry points, and no board internals (classes, layers, custom properties) outside `/dev`.
  - README rewritten. The glyph-ink snapping known issue in `docs/05-site.md` is resolved: nails snap to ink at build time (S08b).
- Intentional visual changes:
  - nails snap to ink; hinges and angles are computed (П 47.6° instead of 37°, О 122.3°);
  - slots are glyph-width;
  - the swing is 2.6 s;
  - fallen letters rest on the shelf (drop from each glyph's ink bottom);
  - the shelf spans the board plus 0.6 em each side, up to 7 em (was the container width, up to 7 em).
- Verified:
  - unit tests: transom 97 (render, client under fake timers, reduced motion, reset, leave-the-page, `fitSize`, call sites), core 112;
  - Biome, `astro check`, typecheck and the build of every TS project, including the 729 share images, pass;
  - on the production build, in Chromium, Firefox and WebKit, 16 pages (ru and en, `/dev/*`) have no CSP violations (read before any screenshot) and no page errors;
  - the hero ends with П at 47.60° in all three engines;
  - without JS, `/osmotr/r/002222` shows П and О fallen, from the attributes;
  - `/dev/animacii`: 232 hanging states, centroid on the plumb line within 0.03 px in all three engines;
  - no horizontal scroll at 375 px on any parity page.
  - Lighthouse mobile on `/`, 3 runs each, local production build:
    - before S08c: perf 0.97–0.98, a11y 1.00, LCP 2.0–2.1 s, CLS 0–0.001;
    - after: perf 0.97–1.00, a11y 1.00, LCP 1.4–2.3 s (median 2.1 s), CLS 0–0.001.
- Deviations:
  - **No generated CSS** (`glyphs.gen.css`): per-slot values ride in `data-v` and the controller sets them through CSSOM, together with the `--t-*` durations from `TIMELINE`. With the D6 charset (295 glyphs) a generated sheet would put about 210 glyph rules on every page; this way a page carries only its board's numbers. CSS rules apply only under `.live`, so the no-JS state comes from the attributes.
  - QuizIsland takes the board as a server-rendered child instead of rendering it on the client, so the quiz needs no glyph table.
  - The namer keeps `set(nails)`: letters drop without the per-op timeline. S11a switches it to `play(ops)`.
- Follow-ups: S13a (share images on `renderTransom`; `og.ts` still lays out the card with its own copy of the geometry and colours), S08d, S11a.
- [HUMAN] open: review the parity sheet: before/after at 375 and 1280 px, ru and en; hero, quiz, the three result codes, a pillar article and the namer. Then tick S08c.
- Closed 2026-09-28: the human reviewed the parity sheet; S08c ticked.

### S13a — Share images on the shared transom renderer — 2026-09-28
- Done:
  - `@beda/tokens/read` has `readTokens(scheme)` and `parseTokens(css, scheme)`: the only parser of `tokens.css` for Node renderers. `base` is the `:root` palette; `dark` adds the `[data-theme="dark"]` overrides. `@beda/brand`'s colour test now uses it instead of its own regex.
  - `renderTransom({ standalone: { palette } })` returns a self-contained `<svg xmlns>` with the board classes mapped to colours in an embedded `<style>`. `CLASS_TOKENS` is the one class → token map, and a test checks that `transom.css` maps the same classes to the same tokens.
  - `apps/web/scripts/og.ts`:
    - `C`, `EM`, `SLOT_*`, `GAP`, `PAD_*`, `NAIL`, `BOARD_*`, `SHELF_GAP`, the glyph and board builders and the S08c glyph adapter are deleted;
    - the card layout stays in satori, and the board is the site's SVG as `<img src="data:image/svg+xml;base64,…">`, sized from `boardWidthEm` into the 580 px column;
    - colours come from `readTokens()`, and the default card's board is `HERO_STEPS`;
    - satori scales the embedded SVG correctly (as in S08a §6), so no separate resvg + sharp compositing is needed.
  - Nx `web:og` inputs: `packages/transom/src/**` (with `glyphs.*.gen.ts`), `packages/tokens/src/tokens.css`, `read.ts` and `package.json`.
- Numbers (local, 732 images): before 42.9 s and 11.5 MB (pre-S08c commit); after 29.2 s and 10.1 MB (−12 %, within ±20 %).
- Verified:
  - `grep -nE "#[0-9a-f]{6}" apps/web/scripts/og.ts` finds nothing;
  - Biome, `astro check`, and typecheck, test and build of every TS project pass (transom 100 tests, tokens 11, brand 63).
- Deviations: the palette is the `base` scheme, not `dark`. Share images have always used the `:root` values (`--tar` #1c140e); the `dark` scheme darkens `--tar` and `--hull`, which would change every card.
- [HUMAN] open: review the image sheet `docs/scratch/1111/spike/shots/og.html` (222222, 002222, 112020, default, one article; before = pre-S08c). Then tick S13a.
- Closed 2026-09-28: the human reviewed the image sheet; S13a ticked.

### S08d — Pun catalogue in `@beda/core` and the `/dev/falls` bench — 2026-09-28
- Done:
  - `@beda/core/src/gags.ts`:
    - `GAGS`: 30 gags with slug ids, the pun's `lang`, text, result and `ops`;
    - `gagById`, `gagsByLang`, `getGagCopy(id, locale)`;
    - copy per UI locale: `GAG_COPY_RU` from the prototype and `GAG_COPY_EN`, drafted by Claude for review (D7). The Russian puns are explained in English, not re-punned.
  - `breaks.test.ts` no longer carries its own copy of the gags.
  - Tests: every gag passes `validateOps` and `applyOps(text, ops) === result`; every character is in `BOARD_CHARSET`; ids are unique slugs; copy exists in both locales.
  - `/dev/falls` (`pages/dev/falls.astro` + `components/falls/FallsBench.tsx`), a port of the prototype page on the v2 transom:
    - the stage fits the width with `fitSize` and has play/reset, slow motion (`k = 2.5`), a debug checkbox and an `aria-live` status;
    - a language filter and a gallery of final-state cards (`aria-pressed`);
    - copy through the dictionary (`falls.*`);
    - noindex, disallowed in robots.txt, and out of the sitemap by the existing `/dev` rule.
- Verified:
  - core 115 tests, and every TS project typechecks, tests and builds;
  - all 30 gags in Chromium (375 and 1280 px) and WebKit (1280 px), with reduced motion emulated so `play` jumps to the end: the status and the aria-label read the stated result, no page errors, no horizontal scroll, one pressed card, the English filter shows 15;
  - production build, Chromium and WebKit: no CSP violations on `/dev/falls`;
  - by render, every remainder reads as the intended letter (Т→Г, Ё→Е, Д→Л, О→С, G→C, R→P, B→P, O→C, E→L). No mask changes in this step. The E>L remainder keeps a small stub of the middle arm at the stem; it was already in the prototype mask.
- Deviations: 30 gags, not 31. BEST LAUNCH → PEST LUNCH is out, because the catalogue rejects it (S00a, D2 recommendation).
- [HUMAN] open:
  - review the English gag copy (`GAG_COPY_EN`, D7);
  - review the contact sheet (`docs/scratch/1111/spike/shots/falls-sheet.html`);
  - confirm that PEST LUNCH stays out (D2).
- Closed 2026-09-28: the human reviewed the contact sheet; S08d ticked. The English gag copy (D7) and PEST LUNCH (D2) stay open and move with S11a and S09a.

### S11a — Name game with letter breaks — 2026-09-28
- Done:
  - `@beda/core/src/charset.ts`: `normalizeName(raw) → { name, removed }`, following D6:
    - NFKC, then upper case, then one space per whitespace run;
    - `LOOKALIKE` (data: quotes, dashes, `‹ ›`, letters of other Cyrillic alphabets);
    - an NFD fallback without combining marks;
    - removal by one regexp built from `BOARD_CHARSET`;
    - plus `canFall()`.
  - `namer.ts`:
    - `prepareName` normalises and cuts to 14 characters;
    - `findOps(name, locale)` returns `{ ops, word, found }`. Each letter or digit is kept, dropped or broken by the transom's break table; punctuation stays on the board and is skipped. It is a per-word DP. Ranking: the longest word, then fewer ops, then fewer breaks, then the earliest ops, then list order. A result whose board shows a stop word is skipped. The fallback is unchanged and expressed as ops;
    - `FUNNY_RU` / `FUNNY_EN` behind `getFunny(locale)`. Both languages stay reachable from either page, and the page's own words come first;
    - added words: лёг, туман, пыль, ох, ой, дохлый; cold, pest, pet, cost, stall, oof, owe, coal, pain, boring, and the phrase «cold push» (letters in order, the space is not a letter);
    - `opsSummary` replaces `fallenLetters` («2 буквы отвалились, у одной откололся кусок» / “2 letters fell off, one lost a piece”);
    - `verdict(typed, result, locale)` keeps its signature.
  - `findRemoval` and `fallenLetters` are removed; nothing else used them.
  - `NamerIsland`:
    - renders `fromOps` with the breaks ready and loads ext glyphs only when needed;
    - plays the ops through the shared controller after `TIMELINE.namerStart` (`finalState` under reduced motion);
    - shows «Убрали: …» / “Removed: …” under the field (dictionary key `namer.removed`, linked with `aria-describedby`);
    - `namer_played { found }` is unchanged, and the name is never sent.
  - `docs/tactics/02-kak-nazovesh.md`: what the field accepts, how input is cleaned, and how the break search works.
- Deliberate changes to expectations:
  - the verdict now reads «6 букв отвалились — и судно уже называется «БАГ»» (was «6 отвалившихся букв — …»);
  - ПОБЕДА → БЕДА, Багтрекер → БАГ, DEADLINE → DEAD, «таск менеджер» → АД and «трекер» → ЕКЕР all still hold;
  - letters now fall on the doc-09 timeline (nails, hang, fall) instead of all at once.
- Verified:
  - core 143 tests (namer lines 97 %): every D6 normalisation example, the catalogue pairs (ДЕНЬГИ → ЛЕНЬ, ДОХОДНЫЙ → ДОХЛЫЙ, ОГОНЬ → СОН, ШТУРМАН → ТУМАН, МЕДАЛЬ → МЕЛЬ, ПОЛЁТ → ЛЁГ, GOLD RUSH → COLD PUSH, BETA → PET), ranking ties, the stop list with breaks, and a 14-letter name under 5 ms;
  - Chromium and WebKit, `/kak-nazovesh?name=Деньги`: Д breaks first, then two letters fall, «Стало: ЛЕНЬ», and the label reads «ЛЕНЬ пусто пусто»;
  - `/en/kak-nazovesh?name=Gold%20Rush`: two breaks, “After: COLD PUSH”;
  - 375 px has no horizontal scroll, and reduced motion jumps to the end;
  - «Rocket 🚀» shows the hint, and «Crème brûlée» loads the ext glyphs;
  - Biome, `astro check` and every TS project's typecheck, tests and build pass.
- Follow-ups: letters with diacritics don't match plain words (`CRÈME` is not `creme`). Folding for the search is an open question.
- [HUMAN] open: review the English word list (`FUNNY_EN`, D7).

### S14a — Pun plaques and easter eggs — 2026-09-28 (partly)
- Done:
  - `@beda/core/gags.ts`: `public: false` on ДОХОД → ЛОХ (the catalogue says «грубовато — решать автору»), `publicGags(lang)`, and `pickGag(key, lang)`, a deterministic FNV-1a pick. `getGagCopy` takes any id and throws on an unknown one.
  - **404 plaque:**
    - `/404` now renders on request (`prerender = false`), so the plaque is picked by the missing path in the page's locale (`/en/…` gets an English pun) and the server markup is final, with no flash;
    - it plays once when half of it is on screen (IntersectionObserver); under reduced motion it shows the final state;
    - the joke is under the board, and a long plaque scales down to the column through its viewBox.
  - **Footer pun:**
    - a final-state board in the footer, picked by path + build day. Prerendered pages change only on a new build, and SSR pages keep the same pun for the day;
    - no link (the human picks; see below);
    - the aria-label reads the result («Надпись на транце: МЕЛЬ»).
  - `beda:find`: `apps/web/src/lib/eggs.ts` `watchEgg(el, id)` sends `CustomEvent('beda:find', { detail: { id } })` once per page when an egg is seen (`plaque:<id>`, `footer:<id>`). Nothing is stored.
  - Bug fixed: `Transom.astro` boards without an `id` all used the prefix `t-`, so two such boards on one page shared clip-path ids (visible on `/dev/transom`). Each board now gets a fresh prefix (`ids.ts`).
- Not done: the **breaking logo**. The fallen rim piece in `tile.svg` is drawn shorter than the gap in the rim (about 3.4 against 7.1 units), so no rigid transform puts it back in place. Deriving `logo-intact` "by reversing the fall" needs the artwork changed, and that changes the favicons, which the step says must not change. Editing `tile.svg` would also invalidate its embedded C2PA manifest. The header still draws its own intact wheel, a second drawing of the brand that should go when the logo comes from `tile.svg`.
- Verified:
  - core 145 tests, transom 100, and every TS project's typecheck, tests and build pass;
  - production build, Chromium and WebKit: `/does-not-exist` returns 404 with a plaque that plays once and sends `beda:find` once; `/en/does-not-exist` shows an English pun and caption; 375 px has no horizontal scroll; no CSP violations and no page errors; no duplicate ids on `/`;
  - 404 CLS (PerformanceObserver): 0 at 375 px and 0.0002 at 1280 px. Lighthouse doesn't score pages that answer 404.
  - Lighthouse `/` mobile, 8 runs: perf 0.91–1.00, a11y 1.00, CLS 0–0.001, LCP 1.5–2.9 s (median ≈ 2.35 s, following FCP). The footer board adds 14 KB uncompressed to every page.
- [HUMAN] open:
  - which gags may appear on public pages (ДОХОД → ЛОХ is off for now);
  - the footer pun's link target (none now, or the quiz);
  - the breaking logo. Options: redraw the fallen piece so it matches the gap, which changes the favicons; derive a separate intact drawing, which is a second drawing; or keep the logo static.

### R1 — ROADMAP: gamification and falls mapped into stages 2–6 — 2026-09-28
- Done:
  - `docs/steps/ROADMAP.md` has a section "Gamification (tactic 09) — where it lands", with all 20 mechanics mapped to steps.
  - One sentence was added to each named step (S18, S20, S26, S29, S30, S31, S32, S35, S36, S37), and the new steps S20a, S20b, S28a, S30a and S30b are listed.
  - The binding "no shame" constraint is recorded: a pause without loss, everything can be switched off, no "you let everyone down" copy, public breaks only by choice. Steps S20–S35 must restate it.
  - Single-source notes:
    - S37 animates the generated glyph data in 3D;
    - S36 takes the transom text from `@beda/transom`;
    - S18 sends from a verified domain;
    - S28a adds no break key without a render check.
  - The "Learned in stage 1" CSP note now describes the v2 transom (`data-v` + CSSOM, no `mounts.css`).
  - `docs/steps/README.md` order table and this file list stage 1b (S00a, S08a–S08d, S13a, S11a, S14a, S09a). Their step files stay in the plan pack, uncommitted, by the human's choice.
- Deviations: none (docs only).

### S09a — English board word, option A — 2026-09-28 (provisional word)
- Done:
  - `@beda/core/src/board.ts`: `getBoardWord(locale) → { letters, ops, result, story? }`.
    - Russian: ПОБЕДА, ops П and О fall → БЕДА. `story` is `HERO_STEPS`, so the Russian hero is unchanged (П hangs on its last nail, О falls).
    - English: the catalogue gag named by `EN_BOARD_GAG`, one line to change.
  - The hero reads `getBoardWord(lang)`. It tells the story in nails when there is one, otherwise it plays the ops (`play`, or `finalState` under reduced motion).
  - The `/en` caption tells the English pun instead of explaining the Russian one.
  - The quiz stays on ПОБЕДА on both locales (option A).
- Provisional word: **PROOF → OOF** (P and R fall, "without its PR"), the closest to ПО + БЕДА among the D2 candidates. Not checked with native speakers.
- Verified:
  - core 149 tests (`getBoardWord` valid and yields its result in both locales);
  - Chromium and WebKit: `/` ends as before (П hanging, О fallen), and `/en` ends as OOF with P and R fallen;
  - Biome, `astro check`, and typecheck, tests and build of every TS project pass.
- [HUMAN] open: D2. Pick the English word (GOLD RUSH → COLD PUSH, BETA → PET, BEST BET → PEST PET, PROOF → OOF, POWER → OWE) with a native-speaker check, then set `EN_BOARD_GAG` and the `hero.caption` en copy, record D2 here and tick S09a.

### S16 (API part) — users and accounts from the token — 2026-09-28
- Done (no step file, by the human's decision: «не расписываешь… за основу берешь пользователей из voxwrite-web/api»):
  - migration `20260928210000_users_accounts.sql`:
    - tables `app.users` (id = `auth.users.id`, `display_name`, `role`, `trusted`, `status`), `app.accounts` (tenant, `kind = 'personal'`) and `app.account_members` (role `owner`/`member`, `priority`); RLS on, no policies;
    - `app.provision_user`, idempotent, called by a trigger on `auth.users` insert and by a backfill for users that already exist; browser roles cannot execute it.
  - `apps/api/src/auth/`:
    - `token.rs`: `Verifier` checks the Supabase access token against the project JWKS (ES256/RS256; the key's algorithm must match the header; `iss`, `aud = authenticated`, `exp`, UUID `sub`; anonymous sessions are refused). Keys are cached for 5 min. An unknown `kid` refetches at most once per 30 s, and the cached keys keep working if a fetch fails.
    - `user.rs`: the `CurrentUser` extractor (and `Option<CurrentUser>` for guests) resolves bearer → claims → `app.users` (60 s cache) → the account from `x-beda-account` if the user is a member, else the default one. `require_role`, `require_account_owner`.
  - `GET /api/me` (`no-store`). New errors: 401 `unauthorized` with `WWW-Authenticate: Bearer`, and 403 `forbidden`.
  - Config: `BEDA_SUPABASE_URL` is required in prod (already in `deploy/.env.example`); new optional `BEDA_JWT_ISSUER`.
  - ADR 0003 (users, accounts, the tenancy rule); API README; ADR 0002 points at `app.users`.
- Verified:
  - `cargo +nightly fmt --check`;
  - clippy `-D warnings` on fresh roots;
  - `cargo test --workspace` with the database: lib 16, auth 9, db 5, events 3, http 7, quiz 4;
  - `cargo sqlx prepare --workspace --check`, the offline release build, `cargo deny check`.
  - The database was a `supabase/postgres:17.6.1.167` container with both migrations applied, not `supabase start`: the CLI binds ports on the Docker host, which this dev container cannot reach. A trigger check running as `supabase_auth_admin` (the role GoTrue writes with) passed.
- Deviations:
  - `app.users`, not `app.profiles` (amendment П-1): same columns plus `status`, and accounts/memberships added for tenancy.
  - `jsonwebtoken` 9.3, not 10+: from 10 on, the crypto backend is `aws-lc-rs` (OpenSSL licence, not allowed by `deny.toml`) or `rust_crypto` (pulls `rsa`, RUSTSEC-2023-0071). 9.3 uses `ring`, which is already in the tree.
  - `reqwest` 0.12 with `rustls-tls-webpki-roots`: `ring` again, and no system CA store needed in the distroless image. The two crates add duplicate `base64` and `tower-http` versions (`cargo deny` warns, bans stay ok).
- New deps: `jsonwebtoken` 9.3, `reqwest` 0.12, and the `serde` feature of `uuid`; dev: `ring` 0.17 and `base64` 0.22 (already in the lockfile), used to sign test tokens with a key generated per run.
- Follow-ups: the web side of S16 (`@supabase/ssr`, middleware, islands); `beda-api admin promote`; S20's `tracker_nails` carries `account_id`.
- [HUMAN] open:
  - ~~local signing keys~~: resolved in the next entry. The local stack (CLI 2.117) signs with ES256 and publishes the key.
  - in the prod project, switch JWT signing to asymmetric keys (Supabase dashboard → JWT signing keys);
  - S17/S18: the GitHub OAuth app, SMTP, Turnstile.

### S16 (rest) — sign-in on the site, `admin promote`, Origin check — 2026-09-29
- Done:
  - **Site**, `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.117.2:
    - `src/middleware.ts` reads the session on on-demand pages with `getClaims()` (verified against the JWKS; refreshes an expired session) and sets `locals.auth` (`userId`, `email`, `accessToken`) and `locals.supabase`. Prerendered pages skip it.
    - `lib/auth/config.ts`: runtime settings `BEDA_SUPABASE_URL` (the same variable as the API), `BEDA_SUPABASE_PUBLISHABLE_KEY`, `BEDA_API_URL`, and `safeNext`.
    - `lib/auth/server.ts`: `serverClient`, and `apiFromServer(locals, path)`, which calls the Rust API with the bearer token.
    - `lib/auth/browser.ts`: `browserClient`, and `apiFetch`, the same call from islands.
    - `/auth/callback` exchanges the PKCE code and goes to a same-site `next`.
  - **`/dev/auth`** (noindex, `/dev` rule): what the server sees, and `/api/me` from the server and from the browser. The island signs in by magic link or by the code from the mail, and signs out. The page adds the Supabase origin to `connect-src` with `Astro.csp.insertDirective`; static pages keep `connect-src 'self'`.
  - **API**:
    - `beda-api admin promote <github-login> [--role …]`, through `app.user_id_by_github_login` (security definer, executable by `beda_api` only; plpgsql, so the migration applies without Supabase Auth, as in CI);
    - Origin check on unsafe methods (`http/origin.rs`): on in prod, `BEDA_ORIGIN_CHECK`, `BEDA_ALLOWED_ORIGINS`.
  - **Local Supabase** (`config.toml`): email sign-ups on, `site_url` and redirect URLs for the dev site. A Russian magic-link mail with the link and the code (`supabase/templates/magic_link.html`).
  - **Migration**: the backfill reads the metadata through `to_jsonb(u)`, so the bare `auth.users` of the compose stack (`deploy/local/initdb`) works too.
  - **Plumbing**: `Taskfile.yml` `dev`, `web:dev` and `api:dev` pass the local Supabase URL and key; robots.txt disallows `/auth/`; `apps/web` has Vitest with the `lib/auth/config` tests; Biome's `noFocusedTests` is off for `.tsx` (the rule took `fit()` for Vitest's `fit`).
- Verified:
  - End to end on the local stack, with Supabase CLI 2.117 (Auth, Kong, Mailpit), the Rust API and `astro dev`: Chromium and WebKit, sign-in by link and by code. Each run: signed out → signed in on the server → `/api/me` 200 from the server and from the browser, the same user with a personal account as owner → sign-out. No console errors.
  - Production build (`node dist/server/entry.mjs`): sign-in by link works. `/dev/auth` sends one `connect-src 'self' <supabase>`, and there are no CSP violations.
  - The migrations apply on the Supabase image without Auth (as in CI), on the full CLI stack, and on plain Postgres 17 with `deploy/local/initdb`.
  - Rust: fmt, clippy `-D warnings`, `cargo test --workspace` with the database (lib 17, auth 9, db 6, events 3, http 8, quiz 4), `sqlx prepare --check`, the offline release build, `cargo deny`. TS: typecheck, test and build of every project; Biome.
  - Sandbox notes, none of which applies on a normal machine:
    - `supabase start` ran behind a port forwarder;
    - Docker could not mount the template, so the stack ran from a copy of the config without it, and the code path took its code from the admin API;
    - `nx run api:*` fails here, because sqlx reads an unrelated `/workspace/.env`, so Rust ran from a mirror of the repo.
- Deviations:
  - Session cookies are readable by JS: `@supabase/ssr` needs that for the browser client, so the spec's `HttpOnly` session cookie does not apply with Supabase.
  - Auth settings are read at runtime, not inlined at build, so one image serves every environment.
  - The OTP code in the mail comes from S18 (Russian templates), pulled forward for the check page.
- New deps: `@supabase/ssr`, `@supabase/supabase-js` (amendment П-1); `vitest` 5.0.2 in `web` (same version as the packages).
- [HUMAN] open:
  - Production `.env` (`deploy/` is outside this step): for the web container, `BEDA_SUPABASE_PUBLISHABLE_KEY` and `BEDA_API_URL=http://api:8080`. `BEDA_SUPABASE_URL` is already there; add them to `deploy/.env.example` in S06.
  - In the Supabase dashboard: asymmetric JWT signing keys; site URL `https://beda.lol`; redirect URL `https://beda.lol/auth/callback`; email sign-ups; the magic-link template (S18).
  - Try it together: `task dev`, then http://localhost:4321/dev/auth.

### S06 (addendum) — deploy files for sign-in — 2026-09-29
- Ask: prepare everything the deploy needs after S16, and list what the human has to do (S06 is still open, so its `deploy/` files are in scope).
- Done:
  - **The web container has its own env file.** `/opt/beda/web.env` (from `deploy/web.env.example`) holds `BEDA_SUPABASE_URL`, `BEDA_SUPABASE_PUBLISHABLE_KEY` and `BEDA_INDEXNOW_KEY`, which are public values. The database and backup secrets in `/opt/beda/.env` no longer reach the web container. Compose sets `BEDA_API_URL=http://api:8080`. The file is optional (`required: false`); without it, sign-in is off.
  - `deploy/.env.example` is now for the api and backup containers only. It lists the optional `BEDA_JWT_ISSUER`, `BEDA_ORIGIN_CHECK` and `BEDA_ALLOWED_ORIGINS`.
  - `BEDA_INDEXNOW_KEY` (S14) had not been listed anywhere; it is in `web.env.example` now.
  - `deploy/SERVER-SETUP.md`:
    - §4 covers both files;
    - new §4a, "Supabase project", lists the dashboard settings: asymmetric JWT keys, URL configuration, email and GitHub providers, SMTP, the magic-link template, and the `beda_api` password;
    - it covers the production GitHub OAuth app, the check on `/dev/auth` after the first release, and `admin promote` on the server.
  - `deploy/README.md` documents both files and `BEDA_WEB_ENV_FILE`. The local compose web service gets `BEDA_API_URL`.
- Verified: `docker compose config` for both files. With a test `web.env`, the web service gets only that file's values plus `BEDA_API_URL`; without the file, it starts with sign-in off.
- Open, not done: **`task prod:up` has been broken since S16.** In prod mode the API needs `BEDA_SUPABASE_URL`, and `tmp/prod-local.env` does not set it. My `Taskfile.yml` edit was refused by the permission check, so it is left to the human. The fix is two more lines in the `prod:up` block that writes `tmp/prod-local.env`:
  - `echo "BEDA_SUPABASE_URL=$(echo '{{.LOCAL_SUPABASE_URL}}' | sed 's#//127.0.0.1:#//host.docker.internal:#')"`
  - `echo "BEDA_JWT_ISSUER={{.LOCAL_SUPABASE_URL}}/auth/v1"`

  Sign-in on the site stays off in `prod:up`: the browser and the container would need the same Supabase URL.
- [HUMAN] open: `/opt/beda/web.env` on the server, and §4a of `deploy/SERVER-SETUP.md`. The rest of S06 is as listed in its entry.

### S17 — GitHub provider — 2026-09-29 (repo part done; not ticked until the OAuth apps exist and a real GitHub sign-in passes)
- Done:
  - `supabase/config.toml`: `[auth.external.github]` is enabled. Its keys come from `supabase/.env` (gitignored; the variable names are in `supabase/.env.example`). The stack starts without them too, as in CI, and only the GitHub button fails.
  - `/dev/auth`: a «Войти через GitHub» button, `signInWithOAuth` with PKCE, back through `/auth/callback`. A denied or cancelled GitHub sign-in lands on `?auth=failed` with the message.
  - Docs:
    - account linking as Supabase does it (ADR 0003): same email, same user, same account; a different email gives a separate user; manual linking stays off;
    - `docs/local-dev.md`, "Sign in with GitHub locally": the dev OAuth app with callback `http://127.0.0.1:54321/auth/v1/callback`;
    - the production app in `deploy/SERVER-SETUP.md` §4a.
- Verified on the local stack (CLI 2.117) with a fake client id:
  - Supabase's `/authorize` redirects to `github.com/login/oauth/authorize` with the client id, `redirect_uri` `…/auth/v1/callback`, scope `user:email` and a PKCE challenge, and the code-verifier cookie is set.
  - GitHub's `access_denied` answer, replayed into Supabase's callback, ends on `/dev/auth?auth=failed`: the message is shown, the user is signed out, and there are no page errors. Chromium and WebKit.
  - The link and code sign-in e2e still passes in both browsers.
  - `supabase start` works with the keys set, with `supabase/.env` missing, and with it copied empty from the example.
  - TS typecheck, test and build; Biome.
  - A real GitHub round trip needs the OAuth app.
- Deviations:
  - No step file; the step ran from its ROADMAP line.
  - The GitHub step was checked with a one-off script in the session scratchpad: the edit to the plan pack's `auth-e2e.mjs` was refused by the permission check.
- New deps: none.
- [HUMAN] open:
  - A dev OAuth app with callback `http://127.0.0.1:54321/auth/v1/callback`; its keys go into `supabase/.env`.
  - A prod OAuth app with callback `https://<project-ref>.supabase.co/auth/v1/callback`; its keys go into the Supabase dashboard (GitHub provider).
  - Then sign in with GitHub on `/dev/auth` together, and run `beda-api admin promote <login>`.

### S18 — Magic link — 2026-09-29 (repo part done; not ticked until SMTP sends from the verified domain and Turnstile is on in production)
- Done:
  - **One sign-in mail.** `supabase/templates/sign_in.html` (renamed from `magic_link.html`) carries the link and the same one-time code, in Russian. `config.toml` uses it for both the `magic_link` and the `confirmation` template: Supabase sends "confirmation" to a new address when «Confirm email» is on, so the production toggle does not change the mail.
  - **Turnstile through Supabase Auth's CAPTCHA.** Locally `[auth.captcha]` holds Cloudflare's published test secret (it accepts any token). On the site:
    - `AuthConfig.turnstile` comes from `BEDA_TURNSTILE_SITE_KEY`; `astro dev` falls back to the matching test site key;
    - `components/auth/Turnstile.tsx` loads Cloudflare's script once, renders the widget (dark, flexible width, page language) and asks for a fresh token after every send, since a token is single-use;
    - the e-mail button stays disabled until there is a token; entering the code needs none.
  - **CSP for sign-in pages in one place.** `lib/auth/csp.ts` `allowSignIn()` opens `connect-src` for Supabase Auth and, when Turnstile is on, `script-src` and `frame-src` for `challenges.cloudflare.com`. An inserted script source replaces Astro's default `'self'`, so it re-adds `'self'`. `/dev/auth` uses it; `/voiti` (S19) will too.
  - **Playwright in the repo.** `apps/web/e2e/sign-in.e2e.ts` + `playwright.config.ts`, `pnpm --filter web e2e`, Chromium and WebKit at 375 px, against the running stack:
    - magic link through Mailpit, then sign-out;
    - the code from the mail;
    - GitHub up to the authorize page, and a cancelled sign-in back to `?auth=failed`.

    Strings come from the dictionary. Not part of `task check`: CI has no Supabase stack.
  - Deploy:
    - `deploy/web.env.example` gets `BEDA_TURNSTILE_SITE_KEY`;
    - `deploy/SERVER-SETUP.md` §4a: SMTP settings, both templates, rate limits, Attack Protection (turn it on only after the site key is live), the sending domain (SPF, DKIM, DMARC) and the Turnstile widget.
  - Docs: `docs/local-dev.md` covers Turnstile locally (and how to work offline) and the e2e run. ADR 0003 gets an "E-mail sign-in" note.
- Verified:
  - **Local Supabase (CLI 2.117), through the API.**
    - `/otp` without a token → 400 `captcha_failed`; with a token → the mail goes out, so Supabase Auth reaches Cloudflare's siteverify.
    - `/verify` with the code needs no token.
    - The mail renders from `sign_in.html`: subject «Вход на beda.lol», link and code.
    - With confirmations on (scratch copy only), the new address gets the `type=signup` mail from the same file, and its code verifies as `type: email`.
  - **E2E:** 6/6, then 3 more runs of 6/6, Chromium and WebKit.
  - **Production build** (`node dist/server/entry.mjs`, test site key), in both browsers:
    - the `/dev/auth` CSP carries `'self'` and Cloudflare in `script-src`, and `frame-src` for Cloudflare;
    - other pages keep the old policy;
    - the Turnstile frame loads, the button waits for the token, and a fresh token arrives after the send;
    - screenshots at 375 px.
  - TS lint, typecheck, test, build (Nx, 5 projects); Biome is clean except the untracked `.claude/settings.json`.
  - `api:test` and `api:build` fail here only on the known `/workspace/.env` sqlx trap. No Rust changed in this step.
- Deviations:
  - No step file; the step ran from its ROADMAP line.
  - This sandbox's Docker cannot bind-mount template files. For the checks the template was copied into the Kong container by hand. The `config.toml` mapping itself was confirmed from the container's mounts.
  - **WebKit logs one CSP error on sign-in pages:** Turnstile's script injects a stylesheet that `style-src` (hashes only) refuses. The widget works and looks the same as in Chromium. I did not add `'unsafe-inline'` to `style-src` for it. The e2e ignores console output from the Turnstile frame (WebKit also logs a postMessage race on navigation); page errors still fail the test.
  - English sign-in mail: not done. There is one Russian template, as the step says. A per-locale mail needs the locale in the user's metadata; left for when `/en` sign-in exists (S19).
- New deps: `@playwright/test` 1.63.0 (dev, `apps/web`). The step names Playwright; the version matches the browsers already used by the spike checks.
- [HUMAN] open:
  - Choose the sending domain (tactic 11: possibly not `.lol`) and a transactional mail provider. Verify the domain there (SPF, DKIM, DMARC), then fill in SMTP in the dashboard (§4a).
  - Create the Turnstile widget for `beda.lol`: the site key into `/opt/beda/web.env`, the secret into Attack Protection. Turn it on after the site key is live.
  - Paste `sign_in.html` into both the Magic link and the Confirm signup templates.
  - Then a joint check on `https://beda.lol/dev/auth`: the mail arrives in the inbox (Gmail, Yandex), and the link and the code both sign in.

### S19 — Login UI and cabinet — 2026-09-29 (repo part done; not ticked until the production secret key is set and a joint check on beda.lol passes)
- Done:
  - **API: account deletion.**
    - `DELETE /api/me` (204). First `store::users::anonymise_user` detaches the user from every table that records a user id (today `app.events.user_id`), in one transaction. Then `auth::AuthAdmin` deletes the `auth.users` row through the Supabase Admin API, which ends the sessions and cascades to `app.users` and the personal account. Last, the user cache entry is dropped.
    - Answers: a failed Admin call gives 500, and a retry finishes the job (404 from Supabase counts as already deleted). Without the key, 503.
    - Config: `BEDA_SUPABASE_SECRET_KEY` (optional; needs `BEDA_SUPABASE_URL`). It is a `Secret` type that prints as `Secret(***)`, and a test checks the key is not in `Config`'s Debug output. Added to `deploy/.env.example` (api only) and `SERVER-SETUP.md` §4.
  - **Site:**
    - `/voiti` and `/kabinet`, plus `/en/…`: on demand, noindex, out of the sitemap. `/kabinet` was already disallowed in robots.txt.
      - `/voiti`: GitHub, the mail with a link and a code, `?auth=failed`, and «Аккаунт удалён» after a deletion. A signed-in visitor goes to `next` or to the cabinet.
      - `/kabinet`: email, sign-in methods, name (hidden when empty), sign-out, sign-out on all devices, account deletion with a required confirmation. A signed-out visitor goes to `/voiti?next=/kabinet`. A token whose user is gone gets signed out.
    - One sign-in island, `SignIn.tsx`, serves `/voiti` and the `/dev/auth` bench; the bench keeps only its `/api/me` probe. Shared styles are in `styles/auth.css`. Links are built in `lib/auth/routes.ts`, the cabinet data in `lib/auth/cabinet.ts`.
    - **Header:** «Войти» or «Кабинет» comes from a server island (`HeaderAccount.astro`, `private, no-store`), with «Войти» as the fallback, so every page stays prerendered.
    - **Forms without JS:** `POST /auth/signout` (`scope=local|global`) and `POST /auth/delete`, which calls `DELETE /api/me` from the server, then clears the cookies. Astro's origin check guards both.
    - **English sign-in mail:** the form stores `lang` in the metadata of a new address. The mail subject (in `config.toml`) and `sign_in.html` pick English for `lang=en`, Russian otherwise.
  - Dictionary: shared `auth.*` keys for the forms (the bench's `authdev.*` keys that duplicated them are gone), plus `signin.*`, `cabinet.*` and `head.signIn` / `head.cabinet`, in ru and en.
  - `task dev` and `task api:dev` pass the local secret key to the API (`LOCAL_SUPABASE_SECRET` from `supabase status`).
  - Docs:
    - ADR 0003: pages and header, what sign-out everywhere does and does not do, and the deletion order;
    - API README;
    - `docs/local-dev.md`;
    - `SERVER-SETUP.md`: the template row and the post-release check;
    - `apps/web/CLAUDE.md`: no JSON-LD on the personal pages.
- Verified:
  - **Rust:**
    - fmt and clippy `-D warnings` on fresh roots;
    - `cargo test --workspace` with the database: lib 18, auth 12, db 6, events 3, http 8, quiz 4;
    - new tests: deletion anonymises first, calls the Admin API with the key, and a cached token then gets 401; a failed Admin call keeps the user; no key gives 503; the secret stays out of Debug output;
    - `sqlx prepare --check`, the offline release build, `cargo deny`.
  - **E2E** (`pnpm --filter web e2e`): 12/12 in Chromium and WebKit, three runs in a row, against `task dev`-like servers.
    - «Войти» in the header on `/osmotr` → `/voiti?next=/osmotr` → the link from the mail → back on `/osmotr` with «Кабинет» → the cabinet → sign-out → `/kabinet` sends to `/voiti`.
    - The code on the bench, with `/api/me` from the server and from the browser.
    - GitHub cancelled → `/voiti?auth=failed`.
    - Sign-out on all devices: the second browser's refresh token is refused (400).
    - Deletion needs the checkbox, then leads to `/voiti?account=deleted`, and the account is gone.
    - `/en/voiti`: English mail subject and body, the English cabinet.
  - **Production build** (`node dist/server/entry.mjs`, test Turnstile key):
    - the island answers `private, no-store`;
    - a POST to `/auth/signout` or `/auth/delete` with a foreign `Origin` gets 403, and a same-origin one works;
    - the `/voiti` CSP carries Turnstile and `'self'`;
    - the e2e passes except the bench's browser `/api/me`, because the bare Node server has no `/api` proxy (Caddy does that in production).
  - Screenshots at 375 px and 1280 px (Chromium, WebKit): no horizontal scroll; the header fits logo, RU/EN and «Войти»/«Кабинет».
  - The mail language was checked on the local Supabase with the templated subject: `lang=en` gets «Sign in to beda.lol», `lang=ru` and no `lang` get «Вход на beda.lol».
  - TS lint, typecheck, test, build (Nx, 5 projects), `astro check` 0 errors. Biome is clean except the untracked `.claude/settings.json`. The JSON-LD audit gives 0 errors; its 6 warnings are the known `datePublished` gap.
- Deviations:
  - No step file; the step ran from its ROADMAP line.
  - **Sign-out on all devices is not instant elsewhere.** Supabase revokes the refresh tokens, but an access token (a stateless JWT) stays valid until it expires: 1 h by default. The cabinet says «в пределах часа». Deletion is instant for the API, because the user row is gone. Closing the window for sign-out would mean checking `session_id` against `auth.sessions` in the API, or a shorter JWT expiry in the dashboard.
  - Deletion is immediate; the spec allows up to 30 days.
  - The mail language is set once, when an address signs up. An existing user who switches to `/en` still gets the language they signed up with.
  - This sandbox's Docker cannot bind-mount templates (as in S18): the scratch Supabase stack got the templates copied into Kong by hand.
- New deps: none.
- Addendum, same day, at the human's request («сгенерь сам скриптом»): `deploy/scripts/supabase-setup.sh` does the dashboard part of §4a through the Management API. It covers:
  - Auth URLs, the e-mail provider, manual linking off;
  - both templates, from the repo files;
  - the secret key `beda_api`, created or reused;
  - optionally the `beda_api` password, GitHub, SMTP and Turnstile;
  - a check of the JWT signing keys.

  Secrets go only to a mode-600 file, and the token reaches curl through a file descriptor, not argv. No token for the production project exists here, so the script was run against a mock Management API:
  - first run and re-run (the key is reused);
  - the HS256 warning;
  - a bad token exits 1 without writing a file;
  - a bad password is refused before any request;
  - the template sent is byte-identical to `sign_in.html`;
  - no secret in the output;
  - shellcheck is clean.
- [HUMAN] open:
  - Run `deploy/scripts/supabase-setup.sh` with an access token and the project ref (`SERVER-SETUP.md` §4a). Copy `supabase-setup.env` into `/opt/beda/.env` and `web.env`, then delete it.
  - Optional: a shorter JWT expiry (Dashboard → JWT Keys) if an hour is too long for sign-out everywhere.
  - Then a joint check on `https://beda.lol/voiti` and `/kabinet`: sign-in three ways, sign-out on all devices, and deleting a test account.

### Secret scan (out of step, the human's request «добавь также лики для проверки утечек») — 2026-09-29
- Done:
  - `.gitleaks.toml` has gitleaks' default rules plus four of its own:
    - `supabase-secret-key` (`sb_secret_…`);
    - `supabase-access-token` (`sbp_…`);
    - `supabase-service-role-jwt` (a JWT whose payload has `"role":"service_role"`);
    - `postgres-url-password`.

    The allowlist is narrow: Cloudflare's public Turnstile test keys, local dev passwords and placeholders, and Astro's server-island key. That key is the `"key"` field of the server bundle's manifest, is never sent to browsers, is random per build, and only encrypts island props (lang, path).
  - `task leaks` runs `gitleaks` or, without it, the `ghcr.io/gitleaks/gitleaks` image of the pinned version (8.30.1). It scans every commit, uncommitted and staged changes, and `apps/web/dist`, and it is part of `task check`.
  - CI (`ci.yml`, `web` job): full history (`fetch-depth: 0`). The gitleaks release binary is checked against its published SHA-256; not `gitleaks-action`, which needs a licence for organisations. After the build, it scans the history and `dist`.
  - The pre-push hook scans every commit when `gitleaks` is installed, and says so when it is not.
  - `apps/web/src/lib/auth/no-secrets.test.ts`: the site code never names the secret or `service_role` key, and `authConfig` does not pass on a secret from the environment.
  - Found on the way:
    - Biome parsed `supabase/templates/sign_in.html` (a Go template with two `<!doctype>`, since S19) and failed. `supabase/templates` is now out of Biome's scope. My S19 check had filtered Biome's output by file type and missed it.
    - A config passed only by cwd is not found by `gitleaks dir`, so every call gives `-c .gitleaks.toml`.
- Verified:
  - The history (51 commits), the working changes and `dist` are clean.
  - Canaries of the real shapes are all caught: a secret key, a PAT, a `service_role` JWT, a pooler URL with a password. Test keys, dev URLs and placeholders pass. The same `"key"` in a client bundle is still caught, and so is a real secret key in the server bundle.
  - A commit with a planted secret in a throwaway clone fails the scan (exit 1), with the value redacted.
  - The CI install step, run locally: the checksum matches, and the binary lands on `GITHUB_PATH`. actionlint 1.7.7 is clean.
  - The pre-push hook passes end to end.
  - The site test fails on a planted file that reads `BEDA_SUPABASE_SECRET_KEY`.
- New deps: gitleaks 8.30.1 (tool, not a package), for the scan the human asked for.
- Addendum, same day («посмотреть как сделано в watchword проекте и добавить тоже самое»), set up as in watchword:
  - `.githooks/pre-commit` scans the staged changes (it skips with a note when gitleaks is missing), and `task hooks` says how to install gitleaks, like watchword's `install-hooks.sh`;
  - a dedicated `secrets` job with the full history in `ci.yml`;
  - a `secrets` job in `images.yml` that every image build `needs`: tags and manual runs do not go through `ci.yml`, just as watchword's release has `needs: [secrets, test]`;
  - one composite action, `.github/actions/setup-gitleaks`, installs the binary for all three jobs.

  Deviations from watchword:
  - Instead of `gitleaks/gitleaks-action@v2` + `GITLEAKS_LICENSE`, the checksum-pinned binary. The action needs a licence for organisations, and actions here are pinned to a SHA.
  - The config has project rules (Supabase) on top of the defaults.
  - The web image's `dist` is scanned too.

  Verified:
  - pre-commit in a throwaway clone: a staged secret gives exit 1 with the value redacted; clean changes give 0; without gitleaks, 0 with the note;
  - actionlint on both workflows;
  - every Taskfile command parses as a string: a `: ` in the new echo had first made YAML read it as a mapping.

### Google and X sign-in (out of step, the human's request «надо добавить войти через гугл и Х и настроить супабейс также») — 2026-09-29
- Done:
  - `apps/web/src/lib/auth/providers.ts` is the one list of OAuth providers: `github`, `google` and `x` (Supabase's X / Twitter OAuth 2.0 provider, not the legacy `twitter` one). It holds their brand names, and `parseProviders` reads `BEDA_AUTH_PROVIDERS`.
  - `authConfig` has `providers`. When `BEDA_AUTH_PROVIDERS` is unset, dev shows every provider and production shows none, the same pattern as the Turnstile key. So production never shows a button for a provider Supabase has off.
  - `SignIn`: one button per provider («Войти через {name}»). With none, the «или по почте» separator goes too.
  - `/voiti`: the lead names the providers the page offers («через GitHub, Google или X — или по почте», joined by `Intl.ListFormat`). With none, it names e-mail only.
  - The `auth.failed` message no longer names GitHub.
  - The cabinet takes method names from the same list.
  - `supabase/config.toml`: `[auth.external.google]` and `[auth.external.x]`, keys from `supabase/.env` like GitHub's. `supabase/.env.example` has the four new variables.
  - `deploy/scripts/supabase-setup.sh`:
    - reads `GOOGLE_CLIENT_ID`/`GOOGLE_SECRET` and `X_CLIENT_ID`/`X_SECRET` in one loop with GitHub;
    - keeps a provider it is not given as the project has it;
    - after the change, reads the project's auth config and writes `BEDA_AUTH_PROVIDERS` into the web.env part of its output.
  - A unit test holds the script's `OAUTH_PROVIDERS` and the `config.toml` sections to `providers.ts`. The two files are now inputs of `web:test` in Nx.
  - Docs:
    - `deploy/SERVER-SETUP.md` §4a covers the script variables and `BEDA_AUTH_PROVIDERS`, plus the steps for the Google OAuth client and the X app.
    - `docs/local-dev.md`: "OAuth sign-in locally".
    - `deploy/web.env.example`.
    - ADR 0003 covers linking: Google joins by verified address. X requires the e-mail permission; an X account without a confirmed address cannot sign in, and `email_optional` stays off.
- Verified:
  - Local Supabase after the restart: `/authorize` for each provider redirects to its authorize page (`github.com/login/oauth/authorize`, `accounts.google.com/o/oauth2/v2/auth`, `x.com/i/oauth2/authorize`).
  - e2e: 18/18 in Chromium and WebKit. That is a new test for the buttons and the lead, and the denied round trip for each of the three providers.
  - The script against a mock Management API:
    - GitHub + X, then Google alone: the second run keeps the other two, and the value is `github,google,x`;
    - the PATCH bodies carry only the given providers;
    - no secret in the output;
    - shellcheck is clean.
  - Screenshots of `/voiti` at 375 and 1280 px, ru and en: no horizontal scroll.
  - Nx lint/typecheck/test/build, `astro check` 0 errors, the JSON-LD audit (0 errors, the 6 known warnings), gitleaks on the history, the changes and `dist`.
  - The Rust API is untouched.
- New deps: none.
- [HUMAN] open:
  - the Google OAuth client and the X app (`deploy/SERVER-SETUP.md` §4a), then the script with their keys and a web restart;
  - the privacy policy and terms URLs that X requires for the e-mail permission, and Google's consent screen asks for (legal pages are S21; until then, X sign-in cannot be switched on in production). Addendum, same day: the pages exist as drafts, see the next entry.

### Loose ends: legal page drafts and `task prod:up` (out of step, the human's request «давай сделаем логические завершения») — 2026-09-29
- Done:
  - **Legal pages, the S21 part done early.** The Google consent screen and the X app need live terms and privacy URLs.
    - `/pravila` («Правила и условия»: the terms, the rules for posts, moderation, the UGC licence, complaints, the brand line) and `/konfidencialnost` («Политика конфиденциальности»), with the same pages under `/en`.
    - Markdown in a new `legal` collection, `src/content/legal/<lang>/<page>.md`, with `title`, `description`, `updated` and `draft` (default true). One page component, `LegalPage.astro`; thin routes.
    - A draft shows a notice, carries `noindex, follow` and stays out of the sitemap (`astro.config.mjs` reads the per-locale draft flag). JSON-LD: `BreadcrumbList`.
    - Links in a second footer nav («Документы»), and under the sign-in form («Входя, вы принимаете правила и политику конфиденциальности»), as the spec's legal section asks.
    - The text states only what the code does:
      - no IP is stored;
      - quiz and namer beacons are anonymous;
      - the Supabase session cookies last up to 400 days;
      - browser storage holds the quiz state;
      - deletion is immediate;
      - encrypted backups are kept up to 6 months;
      - logs have no IP or e-mail.

      Square brackets mark what the human fills in: the operator, the contact address, the Supabase region, the hosting, mail and backup providers, and how changes are announced. Personal data stays out of the repo.
  - **`task prod:up`, broken since S16:** the two lines from the S06+ entry are in. The container's `BEDA_SUPABASE_URL` goes through `host.docker.internal`, and `BEDA_JWT_ISSUER` is the host URL that tokens name.
- Verified:
  - Build: both pages in ru and en, the notice, `noindex`, not in `sitemap-0.xml`; the JSON-LD audit gives 27 pages, 0 errors and the 6 known warnings.
  - `e2e/legal.e2e.ts`: 8/8 in Chromium and WebKit. From the footer to each page; the notice and `noindex`; the heading inside 375 px (the first render cut «конфиденциальности», fixed with a smaller mobile size and hyphens); the sign-in links.
  - Screenshots at 375 and 1280 px.
  - `task prod:up` with freshly built images: `api` and `web` healthy, `/api/readyz` 200 from the web container, `/konfidencialnost` 200. `caddy` did not start in this sandbox, whose Docker cannot bind-mount host files (`deploy/Caddyfile`); that is not the stack. The web image build needs BuildKit (`docker buildx`), which this sandbox lacked until the plugin was installed.
- [HUMAN] open: fill in the square brackets, have the texts checked (the spec: not legal advice; the data region question, amendment П-1 item 8), then `draft: false` in the four files.

