# S09 — Home page

Stage 1 · Depends on: S07, S08 · Medium–large

## Goal
`/` is a production port of the prototype home page: hero with the animated transom, name-game teaser, six pillars, harbour of moorings, author's log teaser, Bermuda triangle teaser, footer — static HTML, one tiny script for the hero sequence.

## Read first
- `archive/site/yacht-beda-site.html` (home markup and CSS)
- `archive/design/canvas/Main.dc.html` and `Mobile.dc.html` (intended layout)
- `docs/05-site.md` §2.2, §8, §9, §11 (differences canvas vs site — follow the site)

## Tasks
1. Components in `apps/web/src/components/home/`: `Hero`, `NamerTeaser` (form that submits to `/kak-nazovesh?name=…`; the interactive version is S11), `Pillars` (data from `@beda/core` `PILLARS`), `Moorings`, `LogTeaser`, `TriangleTeaser`. Page-level CSS ported from the prototype into component-scoped styles; shared bits in the layout.
2. All copy in `src/i18n/ru.ts`. Keep the prototype's wording. Placeholders stay in square brackets exactly as in the prototype (`[ссылка на канал]`, `[N] яхт у причала`, log entries) — do not invent numbers.
3. Moorings: built routes are links (`/osmotr`, `/kak-nazovesh`, `/bukvy/...` for the pillars later); unbuilt ones are non-link cards with «скоро». No dead links.
4. Hero sequence: `Transom` rendered with all letters nailed; a small inline module script (not a framework island) attaches the controller and plays: 0.9 s → П to 1 nail, 3.9 s → О to 0. Skipped under reduced motion (show the final state immediately). Runs once per page load.
5. Journal SVG and the triangle section ported as is.
6. Meta: title «Яхта «Беда» — рубрика о пет-проектах», description from the lead, canonical `https://beda.giglabo.com/`.

## Out of scope
No quiz logic on this page. No analytics. No OG image yet (S13).

## Verify
- Visual parity with `archive/site/yacht-beda-site.html` home at 375, 768, 1280 px (screenshots in the PR description).
- Page JS ≤ 10 KB gzip (report the number).
- No horizontal scroll at 375 px; keyboard focus visible on every link and button.
- `task check` green.

## Done when
- [ ] All sections ported, copy from the dictionary
- [ ] Hero sequence works, respects reduced motion
- [ ] No dead links
- [ ] PROGRESS.md updated with JS size and screenshots
