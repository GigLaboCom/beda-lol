# Roadmap — stages 2–6

One paragraph per future step. Before starting a stage, ask Claude Code: «разверни SNN из ROADMAP в полноценный файл шага по шаблону из steps/README.md», review the file, then run it. Keep the numbering; insert `SNNa` if a step needs splitting.

## Stage 2 — Accounts and tracker

- **S15 OpenAPI contract.** `packages/api-contract/openapi.yaml` generated **from the Rust code** with `utoipa` (derive on handlers and DTOs), served at `/api/openapi.json` in dev; TS client via `openapi-typescript`; `task gen` regenerates both; CI diff check.
- **S16 Supabase Auth wiring (amendment П-1).** `@supabase/ssr` in Astro (cookie session, server client in middleware), browser client for islands; `app.profiles` table (`id` references `auth.users` on delete cascade, `display_name`, `role`, `trusted`) created by a trigger on `auth.users` insert; an axum extractor `AuthUser` verifying the bearer JWT with `jsonwebtoken` against the project JWKS (fetched with `reqwest`, cached, refreshed on unknown `kid`; checks `iss`, `aud`, `exp`), loading the profile with a 60 s cache; `GET /api/me`; `beda-api admin promote`; Origin check kept on unsafe methods.
- **S17 GitHub provider.** GitHub OAuth app (prod + dev), provider enabled in Supabase and in `supabase/config.toml` for local; redirect URLs; account linking behaviour as Supabase implements it — document it.
- **S18 Magic link.** Email provider enabled; custom SMTP configured in Supabase (built-in mail is for testing only); email templates in Russian; Turnstile via Supabase Auth's CAPTCHA setting; Playwright flow through the local mail catcher.
- **S19 Login UI and cabinet.** `/voiti`, `/kabinet` (SSR, noindex), header state via a server island; sign-out and sign-out-everywhere via Supabase; account deletion through the Rust API and the Supabase Admin API (secret key on the server only) with UGC anonymisation first.
- **S20 Server-side tracker.** `tracker_nails` table; `GET/PUT /api/tracker`, `POST /api/tracker/import` (max per letter); `/moya-yahta` page with the tracker island (port from the prototype), guest mode on `localStorage`, import on first login; enable the «Прибить буквы обратно» button from S10.
- **S21 Analytics and legal pages.** Umami container with its own small Postgres container on the VPS (analytics stays off Supabase); `events` for the list in the spec; SQL views for funnel and retention; `/pravila`, `/konfidencialnost` drafts marked for the human's review; uptime monitor notes.

## Stage 3 — Bermuda triangle (first UGC)

- **S22 UGC schema.** In schema `app`, RLS on, deny by default: `wrecks`, `raises`, `reports`, `moderation_log`; status enum; counters and auto-hide triggers; `index_ready` trigger with the thresholds from the spec; outbox jobs on status change.
- **S23 Anti-abuse package.** Turnstile verification, in-memory rate limits per IP and user, link validation and `rel` rules, stop-list, text normalisation; unit-tested.
- **S24 Wreck API.** Create / edit-while-pending / delete own, raise, report; form + JSON handlers with 303 redirects; trust rule.
- **S25 Moderation.** `/admin` queue, decisions with reasons, email to author, `moderation_log`.
- **S26 Triangle pages.** `/treugolnik`, pagination, `/treugolnik/[id]-[slug]` with 301 on slug change, 404/410 by status, hubs by letter / cause / year with the ≥ 5 rule, server islands for counters and buttons, cache headers.
- **S27 UGC SEO.** `/sitemap-ugc.xml` from the API, sitemap index, IndexNow via outbox, dynamic OG images `/og/treugolnik/[id]-[v].png`, JSON-LD `CreativeWork`.
- **S28 Seeding and launch.** Admin import for the first 10–15 epitaphs; rules page final; [HUMAN] write and approve the seeds.

## Stage 4 — Registry

- **S29 Registry schema and API.** `yachts`, `lifebuoys`, `letter_pins`, `tows`, `tried`; endpoints; notifications to authors via outbox.
- **S30 Registry pages.** `/gavan`, yacht pages, hubs, card grid; seeding 10 yachts including the author's own projects.

## Stage 5 — Return and toys

- **S31 Telegram bot.** Webhook with secret header, deep-link account linking, reminders job, `reminder_*` events.
- **S32 Rust.** Daily job for О and Д, «стоянка» (pause) setting, UI explanation.
- **S33 Author's log.** `/zhurnal` with manual weekly entries (admin form), heel and water visual, optional GitHub events via server-side cache.
- **S34 Leak calculator.** `/kalkulyator` island with the formula from tactic 05 shown on the page; tests for the example table.
- **S35 Storm game.** Deterministic engine in `@beda/core` with a seeded RNG (optionally later: port to `crates/storm` and build to WASM if server-side verification is needed — amendment П-2 rule 5), event deck, 1 000-run balance simulation in tests, `/shtorm` island, seed in the URL.

## Stage 6 — 3D

- **S36 `packages/yacht-3d`.** Port `archive/src/yacht-threejs.html` to an ES module with three as a package; mirroring and hull logic unchanged; tests for pure helpers.
- **S37 Letter animation in 3D.** Port the bench (`archive/src/letter-anim-debug.html`) with glyph ink snapping; follow `docs/03-integration-plan.md`.
- **S38 Lazy 3D on the home page.** `client:idle`, device capability check, CSS transom stays for weak devices and as LCP; Lighthouse budget unchanged.
