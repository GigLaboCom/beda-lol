# S11 — Name game page

Stage 1 · Depends on: S09 · Small–medium

## Goal
`/kak-nazovesh` lets a visitor type a project name, drops the letters found by `findRemoval` off a transom sized to the name, and shows the verdict with a shareable link.

## Read first
- Prototype `#namerForm` handler in `archive/site/yacht-beda-site.html`
- `docs/tactics/02-kak-nazovesh.md`, `docs/05-site.md` §5

## Tasks
1. Prerendered page with an intro and a Preact island `NamerIsland` (`client:visible`): labelled input (max 14), submit button «Спустить на воду», result area with `aria-live="polite"`.
2. Transom size computed from available width and name length like the prototype (`min(64, max(20, avail / (n·0.85 + 0.8)))` px), recomputed on resize.
3. On submit: `normalizeName` → render transom with all nails → after 450 ms set removed letters to 0 → verdict text («Было / Стало» + line).
4. URL state: `?name=<value>` read on load (the home teaser submits here) and updated with `history.replaceState` on submit, so the link is shareable. Validate and normalise on read.
5. Record `namer_played` in `app.events` via a tiny `POST /api/events` in the Rust API (event name is a serde enum, so only allow-listed names deserialize; rate limited with `governor`; 204) — only the event name and `props.found: boolean`, never the typed name.
6. Page meta: indexable; title «Как назовёшь — что останется от названия проекта».

## Out of scope
No large dictionaries, no LLM verdicts (tactic 02 lists them as later work).

## Verify
- Sample names from S07 behave as in the table.
- Link with `?name=Багтрекер` reproduces the result.
- The typed name never reaches the server (check the request body).
- `task check` green.

## Done when
- [ ] Island with sized transom and verdict
- [ ] Shareable URL
- [ ] Event recorded without the name
- [ ] PROGRESS.md updated
