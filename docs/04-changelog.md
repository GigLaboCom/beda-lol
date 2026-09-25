# 04 — Changelog

All iterations were done in a single working session. Artifacts were updated in place.

## Yacht scene (`yacht-threejs.html`)

**v1 — initial model.** Procedural gaff-rigged yacht after a reference photo of a wooden model on a stand in a log cabin: lofted hull, deck, rail, bowsprit, gaff main, jib, staysail, rigging, deckhouse, wheel, fittings, cradle stand, shelf. Orbit camera, autorotate, sails toggle. Deliberately an original design — no cartoon characters or crew.

**v2 — symmetry rebuild.** Reported: looking from the stern, the port side differed from starboard.
Causes found:
- port rail built with `geometry.scale(1, 1, −1)` → flipped winding and inverted shading;
- hull loft had reversed triangle winding, so the outer surface was back-facing in places;
- several fittings existed on one side only.
Fix: model only the starboard half (`z ≥ 0`), put centreline items in a separate group, generate port with `mirrorZ()` (geometry reflection + winding swap + `S·R·S` transform). Added `orient()` to auto-correct winding from a probe normal and `seamNormals()` to remove the keel crease. Door moved to the centreline. Added "Плоские паруса" and "Вид с кормы".

**v3 — transom name.** Six separate letters ПОБЕДА as alpha-tested canvas planes; click / tap to knock off; ghost imprint; "Отколоть «ПО»" and "Прибить обратно". Text orientation derived so it reads correctly from astern. `nameGroup` excluded from mirroring.

**v4 — transom hole.** Reported: a triangular hole at the stern. The transom fan originated at mid-height, leaving the triangle between that point, the rail corner and the top centreline unfilled. Fan now starts at the top centreline point. Inner bulwark `x`-scale changed 0.995 → 1.0 to close a 2.5 cm gap at the transom.

## Animation bench (`letter-anim-debug.html`)

**b1 — П.** Separate file. Three phases: shudder with three nails popping → four damped swings on the remaining top corner nail → fall continuing the swing's angular velocity (`v = ω × r`). Sliders for all timings, pivot/arc helper, status line. О rigged but static.

**b2 — О and selector.** О mounted with four rivets on its oval, two per side, mirror-symmetric; hangs last on the left-bottom one and topples. Equilibrium generalised from `atan(W/H)` to `wrap(π − atan2(off.z, off.y))`. Letter selector in the UI; "lean" slider so the О's large arc clears neighbours. Rivets rendered as domes, nails as flat heads.

**b3 — fixings on ink.** Reported: fixings sat inside the letters, in empty space. Cause: planes were the full 128² canvas; fixings were placed relative to the plane, not the glyph. Fix: scan alpha for the ink bounding box, crop texture via `offset`/`repeat`, size each plane to the glyph's aspect, lay out the word by cumulative width, and snap every fixing target to the nearest ink pixel.

## Design mockup (`design/canvas/`)

**d1 — six artboards.** Home, quiz question, quiz result, tracker, share card, mobile home on a Design canvas. Own small visual system (tarred wood, brass, bleached canvas, sea tone for the triangle; Playfair Display, IBM Plex Sans, IBM Plex Mono). Prototype links between screens. All unknown facts as square-bracket placeholders.

## Website (`site/yacht-beda-site.html`)

**s1 — interactive page.** The mockup rebuilt as a real responsive page with hash routing and three working mechanics:
- reusable `em`-based transom component with per-letter mounts, CSS swing and fall;
- ship inspection quiz with live nail loss, final letter-by-letter reveal, class, actions, share text;
- name game with subsequence search over a small word list and a stop-list on the fallback;
- tracker with nail slots, next steps, `localStorage` persistence.
Template tells from the mockup (all-caps eyebrows, middle-dot joins, trailing arrows) removed; hanging О rotation corrected.

## Archive

**a2 — site and design added.** `site/`, `design/canvas/`, `docs/05-site.md`, `docs/06-design-mockup.md`, updated README with status and artifact links.

## Production spec

**p1 — beda.giglabo.com.** Decided the production stack and wrote the full spec (`07-spec-beda-giglabo.md`, in Russian): public monorepo `beda-giglabo` with Astro (Node SSR, Preact islands) and a Go API (`beda-api`: HTTP, migrations, jobs), own Postgres with sqlc/goose, own auth (GitHub OAuth + magic link, DB sessions), text-only UGC with premoderation, indexing rules (hubs + `index_ready` threshold, IndexNow, sitemaps), 729 prebuilt share images, single VPS with Docker Compose behind Caddy, GitHub Actions CI/CD to GHCR with SSH deploy and automatic rollback, public-repo security settings, analytics and backups, seven delivery stages.

**a3 — archive.** Spec added to `docs/`, README updated with the plan and the spec link.

## Claude Code kit

**k1 — step-by-step execution kit.** `claude-code/`: `CLAUDE.md` for the repo root (sources of truth, stack, commands, conventions, hard rules, step procedure), slash commands `/step NN` and `/next`, step template and handover format, progress log, fully specified steps S00–S14 (foundation and stage 1) and a one-paragraph roadmap S15–S38 for stages 2–6. Decision recorded in S01: the Go module lives at the repo root so `db/migrations` can be embedded; `.env` on the server is maintained by hand because the forced-command deploy key cannot write files (both deviate from the spec and are flagged in the steps).

## Water scene

**w1 — `src/beda-water.html`.** Standalone three.js sea for the yacht: six Gerstner waves fanned around the wind direction with deep-water dispersion, sky dome with sun disc, Fresnel reflection, sun glint, crest translucency, compression-based foam, normal-only ripples, distance fog; presets golden hour / noon / triangle with smooth transitions; sliders for height, steepness, wind, time scale. `window.water.sample(x, z)` is an exact CPU copy of the shader waves with 4-iteration inversion of the horizontal displacement (worst horizontal error ≈ 9 mm over 2 000 random samples); three buoys ride on it as a live check.

## Amendment П-1

**p2 — Supabase stays.** Database and auth move to Supabase; the Go API stays and connects directly, verifying Supabase JWTs locally. Recorded as `docs/08-amendments.md` (and in the live spec). Claude Code kit updated: CLAUDE.md, S00–S02, S04–S06, roadmap S16–S22. The Go module returns to `apps/api` (no embedded migrations any more).

## Yacht on the water

**w2 — `src/beda-water.html`.** The yacht from `yacht-threejs.html` (hull, mirroring, rig, sails, transom name) is built by an extracted `buildYacht()` without the stand and shelf and placed at anchor. Five water samples (bow, stern, both sides, midship) give target heave, pitch and roll; each goes through a damped spring (≈1.3 s, 1.9 s, 2.4 s) so the boat lags the water like a heavy body. Bow is held into the waves with slow yaw swing on the anchor. Sun shadows follow the boat; renderer switched to sRGB output for the yacht's standard materials (custom water and sky shaders write colour unchanged). New toggles: sails, «ПО» fallen off. Known limitation: water is not masked inside the hull, visible only when crests rise above the deck.

## Amendment П-2

**p3 — API in Rust.** The backend moves from Go to Rust: axum + tower-http, tokio, sqlx with compile-time checked queries and committed offline data, jsonwebtoken + reqwest (rustls) for Supabase JWKS, tracing, governor, clap; cargo fmt/clippy/deny as the quality gate; cargo-chef + static musl build into distroless. Recorded in `docs/08-amendments.md` and the live spec. Claude Code kit: CLAUDE.md, BOOTSTRAP, S00–S05, S10, S11 and roadmap S15, S16, S19, S35 updated; S01 and S02 rewritten. OpenAPI now generated from Rust with utoipa (S15).
