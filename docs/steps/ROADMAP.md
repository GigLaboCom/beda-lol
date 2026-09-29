# Roadmap — stages 2–6

One paragraph per future step. Before starting a stage, ask Claude Code: «разверни SNN из ROADMAP в полноценный файл шага по шаблону из steps/README.md», review the file, then run it. Keep the numbering; insert `SNNa` if a step needs splitting.

## Stage 2 — Accounts and tracker

- **S15 OpenAPI contract.** `packages/api-contract/openapi.yaml` generated **from the Rust code** with `utoipa` (derive on handlers and DTOs), served at `/api/openapi.json` in dev; TS client via `openapi-typescript`; `task gen` regenerates both; CI diff check.
- **S16 Supabase Auth wiring (amendment П-1).** Done 2026-09-28/29 (ADR 0003, PROGRESS): `app.users` + `app.accounts` + `app.account_members` (tenancy after voxwrite-web) from a trigger on `auth.users`; the `CurrentUser` extractor (JWKS, 60 s user cache); `GET /api/me`; `beda-api admin promote`; Origin check; `@supabase/ssr` middleware, browser client for islands, `/auth/callback`, the `/dev/auth` check page.
- **S17 GitHub provider.** GitHub OAuth app (prod + dev), provider enabled in Supabase and in `supabase/config.toml` for local; redirect URLs; account linking behaviour as Supabase implements it — document it. Repo part done 2026-09-29 (PROGRESS); the OAuth apps are [HUMAN]. Google and X added on the same path the same day (PROGRESS).
- **S18 Magic link.** Email provider enabled; custom SMTP configured in Supabase (built-in mail is for testing only); email templates in Russian; Turnstile via Supabase Auth's CAPTCHA setting; Playwright flow through the local mail catcher. Magic-link mail goes out from a verified sending domain (tactic 11). Repo part done 2026-09-29 (PROGRESS); SMTP, the sending domain and the Turnstile widget are [HUMAN].
- **S19 Login UI and cabinet.** `/voiti`, `/kabinet` (SSR, noindex), header state via a server island; sign-out and sign-out-everywhere via Supabase; account deletion through the Rust API and the Supabase Admin API (secret key on the server only) with UGC anonymisation first. Repo part done 2026-09-29 (PROGRESS); the production secret key and the joint check are [HUMAN].
- **S20 Server-side tracker.** `tracker_nails` table; `GET/PUT /api/tracker`, `POST /api/tracker/import` (max per letter); `/moya-yahta` page with the tracker island (port from the prototype), guest mode on `localStorage`, import on first login; enable the «Прибить буквы обратно» button from S10. First in the gamification rollout: weather as project state (tactic 09 #3; the presets of `archive/src/beda-water.html` map to state) and weekly watches with «якорная стоянка» (#4).
- **S20a Nail metals, ranks, plaque collection (new).** Tactic 09 #1, #5, #6: metals of the nails, ranks, and the plaque collection, which persists the `beda:find` events emitted since S14a.
- **S20b «Отколи у меня букву» (new).** Tactic 09 #10: a user opts in to a public break of their own board; the break is an `Op` with `brk` from `@beda/core` and plays on the shared transom.
- **S21 Analytics and legal pages.** Umami container with its own small Postgres container on the VPS (analytics stays off Supabase); `events` for the list in the spec; SQL views for funnel and retention; `/pravila`, `/konfidencialnost` drafts marked for the human's review (done early, 2026-09-29, for the Google and X apps: PROGRESS); uptime monitor notes.

## Stage 3 — Bermuda triangle (first UGC)

- **S22 UGC schema.** In schema `app`, RLS on, deny by default: `wrecks`, `raises`, `reports`, `moderation_log`; status enum; counters and auto-hide triggers; `index_ready` trigger with the thresholds from the spec; outbox jobs on status change.
- **S23 Anti-abuse package.** Turnstile verification, in-memory rate limits per IP and user, link validation and `rel` rules, stop-list, text normalisation; unit-tested.
- **S24 Wreck API.** Create / edit-while-pending / delete own, raise, report; form + JSON handlers with 303 redirects; trust rule.
- **S25 Moderation.** `/admin` queue, decisions with reasons, email to author, `moderation_log`.
- **S26 Triangle pages.** `/treugolnik`, pagination, `/treugolnik/[id]-[slug]` with 301 on slug change, 404/410 by status, hubs by letter / cause / year with the ≥ 5 rule, server islands for counters and buttons, cache headers. The raise-from-the-bottom quest (tactic 09 #13) rides on `raises`.
- **S27 UGC SEO.** `/sitemap-ugc.xml` from the API, sitemap index, IndexNow via outbox, dynamic OG images `/og/treugolnik/[id]-[v].png`, JSON-LD `CreativeWork`.
- **S28 Seeding and launch.** Admin import for the first 10–15 epitaphs; rules page final; [HUMAN] write and approve the seeds.
- **S28a «Верфь» and the namer finds board (new, after S25 moderation).** Tactic 09 #12, #20: a pun submission is one `{ text, result, ops }` row, validated by `validateOps` + `applyOps` and rendered by the same transom; no new break keys without a render check in the transom font.

## Stage 4 — Registry

- **S29 Registry schema and API.** `yachts`, `lifebuoys`, `letter_pins`, `tows`, `tried`; endpoints; notifications to authors via outbox. The rescuer medal (tactic 09 #9) lands here.
- **S30 Registry pages.** `/gavan`, yacht pages, hubs, card grid; seeding 10 yachts including the author's own projects. Launch day (tactic 09 #15) lands here.
- **S30a Regatta (new).** Tactic 09 #7.
- **S30b Crews (new).** Tactic 09 #8; crew chat comes after S31.

## Stage 5 — Return and toys

- **S31 Telegram bot.** Webhook with secret header, deep-link account linking, reminders job, `reminder_*` events. The message in a bottle (tactic 09 #14) goes through the reminders job.
- **S32 Rust.** Daily job for О and Д, «стоянка» (pause) setting, UI explanation. The watch task (tactic 09 #16) goes through the bot.
- **S33 Author's log.** `/zhurnal` with manual weekly entries (admin form), heel and water visual, optional GitHub events via server-side cache.
- **S34 Leak calculator.** `/kalkulyator` island with the formula from tactic 05 shown on the page; tests for the example table.
- **S35 Storm game.** Deterministic engine in `@beda/core` with a seeded RNG (optionally later: port to `crates/storm` and build to WASM if server-side verification is needed — amendment П-2 rule 5), event deck, 1 000-run balance simulation in tests, `/shtorm` island, seed in the URL. Storm of the week (tactic 09 #17): one seed per ISO week.

## Stage 6 — 3D

- **S36 `packages/yacht-3d`.** Port `archive/src/yacht-threejs.html` to an ES module with three as a package; mirroring and hull logic unchanged; tests for pure helpers. The yacht grows with the project (tactic 09 #2, S36–S38); the transom text on the yacht comes from `@beda/transom` glyph data.
- **S37 Letter animation in 3D.** Port the bench (`archive/src/letter-anim-debug.html`) with glyph ink snapping; follow `docs/03-integration-plan.md`. It uses the generated glyph data (outline paths → `ShapeGeometry`, the same nails, hinges, angles and break polygons); no second measurement.
- **S38 Lazy 3D on the home page.** `client:idle`, device capability check, CSS transom stays for weak devices and as LCP; Lighthouse budget unchanged.


## Gamification (tactic 09) — where it lands

| # | Mechanic | Step |
| --- | --- | --- |
| 3, 4 | weather = project state; weekly watches + «якорная стоянка» | S20 (first in rollout) |
| 1, 5, 6 | nail metals; ranks; plaque collection (consumes `beda:find` from S14a) | S20a (new) |
| 10 | «Отколи у меня букву» (public break of your own board, opt-in) | S20b (new) |
| 13 | raise-from-the-bottom quest | S26 |
| 12, 20 | «Верфь» pun contest; namer finds board | S28a (new, after S25) |
| 9, 15 | rescuer medal; launch day | S29 / S30 |
| 7, 8 | regatta; crews | S30a, S30b (new) |
| 14, 16 | bottle message; watch task | S31 / S32 |
| 17 | storm of the week | S35 |
| 2 | yacht grows with the project | S36–S38 |
| 11, 18 | «Отколи у автора»; seasonal themes | content, no code |
| 19 | easter eggs | done in S14a (404 plaque, footer pun) |

The falls engine and the break table are one implementation (`@beda/core` breaks and gags, `@beda/transom` renderer and controller, glyph data generated from the font); every step above that shows a board or a break reuses them.

**Binding constraint — no shame** (tactic 09 «Чего не делать»):
- every streak or rust mechanic has a pause without loss;
- everything can be switched off;
- no "you let everyone down" copy, anywhere, including reminders;
- public breaks only by the user's own choice.

Steps S20–S35 restate this in their "Out of scope" or "Verify".

## Learned in stage 1 (2026-09-25)

- **Nx, not Turborepo.** Targets come from each package's `package.json` scripts; extra config lives in the package's `nx` field (e.g. `web:og` → `web:build`). The Rust API is an Nx project too (`apps/api/project.json`), so `nx run-many -t test` covers both halves. CI caches `.nx/cache`.
- **CSP forbids inline `style` attributes.** Astro's CSP hashes scripts and styles, which also blocks server-rendered `style="…"`. The transom therefore carries no inline styles (since S08c: final state in SVG `transform` attributes, per-slot values in `data-v` set through CSSOM by the controller). New components must follow the same rule: set dynamic values through classes or CSSOM (`el.style.setProperty`), never through SSR `style` attributes.
- **On-demand routes cannot `Astro.rewrite` to a prerendered page.** Render the `NotFound` component with `Astro.response.status = 404` instead.
- **Rate limits run before body parsing** (per-route middleware), so malformed requests count too. Client IP = last `X-Forwarded-For` entry (Caddy sets it), else the peer address.
- **satori and Fontsource:** register each subset (latin, cyrillic) under its own font name and list both in `fontFamily`; satori does not merge same-named fonts. satori's `transform` + `transformOrigin` render the hanging and fallen letters correctly.
- **Postgres 16+ role grants:** the migration owner must be granted the new role (`grant beda_api to postgres`) to `set role` in tests.
- **Result pages only know states, not scores** (a shared link carries the code), so actions are picked from fallen, then hanging letters.
- Open for stage 2: `/moya-yahta` (the result page's «Прибить буквы обратно» is behind `TRACKER_ENABLED`), real channel/contact URLs in `ru.ts`, and turning the harbour «скоро» cards into links as sections ship.
