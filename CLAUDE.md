# beda.lol

Website for the personal-branding rubric «Яхта Беда» at https://beda.lol. The rubric jokes that people build pet projects "sailing on the yacht Беда" and skip marketing: ПОБЕДА = ПО + БЕДА — lose the "ПО" and only "БЕДА" (trouble) remains. The site turns this into interactives: a ship-inspection quiz, a name game, a nail-by-nail progress tracker, a registry of user projects, and an epitaph wall for abandoned projects.

## Sources of truth

| What | Where |
| --- | --- |
| Full spec (Russian) — stack, routes, API, DB, UGC, SEO, CI/CD, stages | `docs/07-spec-beda-giglabo.md` |
| **Amendments — override the spec** (Russian) | `docs/08-amendments.md` (П-1: Supabase stays; П-2: API in Rust) |
| Current step and history | `docs/steps/PROGRESS.md` |
| Step files | `docs/steps/SNN-*.md` |
| Tactics (product behaviour, copy ideas; Russian) | `docs/tactics/` |
| Working prototypes to port from | `archive/site/yacht-beda-site.html` (site, quiz, name game, tracker), `archive/src/` (three.js yacht, letter animation bench), `archive/design/canvas/` (mockup) |
| Prototype tech docs | `docs/01-*.md` … `docs/06-*.md` |

`archive/` is read-only reference. Port from it; never edit it.

Precedence: step file > amendments (`docs/08-amendments.md`) > spec. Note any deviation in PROGRESS.md.

Two repo-wide deviations from the spec apply everywhere: the TypeScript side is orchestrated by **Nx** (wherever the spec or a step says Turborepo / `turbo`, read Nx / `nx`), and the site lives at **beda.lol** (the spec says `beda.giglabo.com`).

## Stack

- Monorepo — pnpm workspaces for dependencies, **Nx** for task orchestration and caching of the TypeScript projects (`nx.json`; targets come from each package's `package.json` scripts). The Rust API is also an Nx project (`apps/api/project.json`, targets run `cargo`) so `nx graph` shows the whole repo; Cargo stays the source of truth for Rust.

- `apps/web` — Astro with `@astrojs/node` (standalone), Preact islands. Pages are prerendered by default; UGC, personal and service routes opt out with `export const prerender = false`. Astro changes between majors: before writing config or using an API, check the official docs for the installed version (e.g. `output: 'hybrid'` no longer exists).
- `apps/api` — **Rust** (amendment П-2), crate `beda-api` in a Cargo workspace rooted at the repo, single binary with subcommands `serve`, `admin`, `healthcheck`, `version`. `axum` + `tower-http`, `tokio`, `sqlx` (compile-time checked queries, offline data in `.sqlx/`), `tracing`, `thiserror`/`anyhow`, `clap`, `jsonwebtoken` + `reqwest` (rustls) for Supabase JWKS. Connects to the Supabase Postgres directly; verifies Supabase Auth JWTs locally. `#![forbid(unsafe_code)]`; no `unwrap`/`expect` outside tests and startup. Wherever the spec says "Go", read "the Rust API".
- **Supabase** — Postgres + Auth (GitHub provider, magic link). Schema and migrations with the Supabase CLI in `supabase/migrations/`. Local dev with `supabase start`. App tables live in schema `app`, which is **not exposed** through the Data API; the browser uses supabase-js only for sign-in. Never create app tables in `public`.
- `packages/core` — pure TS logic (quiz, name search, result codec, later the storm game). No DOM, no framework.
- `packages/transom` — the transom (name board) component: CSS, per-letter mounts, SSR markup + client controller.
- `packages/tokens` — design tokens (CSS custom properties) and fonts.
- `packages/api-contract` — OpenAPI spec and generated TS client (added in stage 2).
- `supabase/` — CLI config and migrations (the only source of schema). SQL for the API lives next to the Rust code in `sqlx::query!` macros.
- `deploy/` — compose files, Caddyfile, scripts. One VPS, Docker Compose, Caddy with automatic TLS.
- CI/CD — GitHub Actions; images to GHCR; SSH deploy with forced command; automatic rollback.

## Commands

All common commands go through Task (`Taskfile.yml`). Prefer them over ad-hoc commands.

| Command | Does |
| --- | --- |
| `task dev` | dev stack: `supabase start` (Postgres, Auth, mail catcher), the Rust API with reload (`watchexec`), `astro dev` (proxies `/api` to the API) |
| `task check` | everything CI runs: lint, typecheck, unit tests, builds, `gen` diff check |
| `pnpm nx run-many -t build` | Nx directly: build every TS project (also `test`, `lint`, `typecheck`); `pnpm nx graph` shows the project graph |
| `task test` | unit tests only |
| `task gen` | `cargo sqlx prepare --workspace` (+ OpenAPI codegen from stage 2) |
| `task migrate:new -- <name>` | `supabase migration new <name>` |
| `task db:reset` | `supabase db reset` (re-applies migrations and seed) |

Run `task check` before declaring a step done. It must pass.

## Conventions

- Code, comments, commit messages, identifiers: English. All user-facing copy: Russian, through the dictionary in `apps/web/src/i18n/ru.ts` (even while there is one language).
- Workspace packages use the `@beda/` scope: `@beda/core`, `@beda/transom`, `@beda/tokens`, `@beda/api-contract`; the web app is `web`.
- Mobile-first: design and verify at 375 px width first, then desktop.
- Colours only through CSS custom properties from `packages/tokens`; the site is dark-first, keep a light-scheme override working.
- Accessibility: real `<button>`, `<a href>`, `<label>`; visible focus; respect `prefers-reduced-motion`; transom has `role="img"` with a text label.
- Conventional Commits. Each step works on branch `step/SNN` with one or a few focused commits. The human opens and merges the PR; a merge to `main` deploys (from S06 on).
- Generated artefacts (`.sqlx/`, OpenAPI clients) are committed; CI fails if `task gen` produces a diff or `cargo sqlx prepare --check` fails. Image builds use `SQLX_OFFLINE=true`.
- New dependencies: only those named in the step, or the smallest well-maintained option — say which and why in PROGRESS.md.
- Tests: pure logic gets unit tests (Vitest / `cargo test`). DB tests run against the local Supabase database inside a rolled-back transaction. Every bug fixed gets a test.
- Rust quality gate: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo deny check`.

## Hard rules

- Never commit secrets, `.env` files, dumps, or real personal data. Only `*.env.example` with variable names.
- Never use `pull_request_target` in workflows. Minimal `permissions:` per job. Pin third-party actions to a full commit SHA (resolve with `git ls-remote` or `gh api`), with the tag in a comment.
- Never change `deploy/`, `.github/`, or `supabase/migrations/` outside a step that asks for it.
- Supabase secret / service_role key: only in the server `.env` for the API. Never in the frontend, images, or CI logs. The publishable/anon key is public and may go to the frontend.
- Every table in schema `app` has RLS enabled with no permissive policies (deny by default); the API connects as role `beda_api` (with `bypassrls`).
- Migrations are forward-only once merged; write expand/contract changes for anything destructive.
- UGC is text-only; outbound user links get `rel="ugc nofollow noopener"`.
- Brand: no characters, quotes, songs or recognisable imagery from the cartoon «Приключения капитана Врунгеля». The yacht, style and texts are original. The word «БЕДА» on the transom is fine.
- Items marked **[HUMAN]** in a step: do not attempt them. Stop, list them clearly, wait for "готово", then verify.

## Working a step

1. Read this file, `docs/steps/PROGRESS.md`, and the step file.
2. Check the step's dependencies are done in PROGRESS.md. If not, stop and say so.
3. Read the spec sections and archive files the step lists. Do not skim the whole repo.
4. Do the tasks in order. Stay inside the step's scope ("Out of scope" is binding).
5. Run the step's verification commands and `task check`.
6. Commit. Append the handover entry to PROGRESS.md (template in `docs/steps/README.md`) and tick the step.
7. Stop. Do not start the next step.

## Project facts

- Domain: `beda.lol`. Repo: `GigLaboCom/beda-lol`, public.
- GitHub owner: `GigLaboCom` (GHCR images live under the lowercase `ghcr.io/giglabocom/`).
- Ports (dev): web 4321, api 8080; Supabase local ports as printed by `supabase start` (defaults: API 54321, DB 54322, Studio 54323, mail 54324) — read them, don't hardcode.
