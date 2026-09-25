# S10 — Ship inspection quiz and result page

Stage 1 · Depends on: S09, S02 · Medium–large

## Goal
`/osmotr` runs the 12-question quiz with live nail loss on the transom and ends on `/osmotr/r/[code]`, a server-rendered, `noindex` result page with class, chips, three actions and sharing; each completed attempt is recorded anonymously via the API.

## Read first
- Prototype quiz: `archive/site/yacht-beda-site.html` (`#view-quiz`, `startQuiz`, `showResult`)
- `docs/tactics/01-osmotr-sudna.md`
- `docs/05-site.md` §4
- `archive/design/canvas/Quiz.dc.html`, `Result.dc.html`

## Tasks
1. `/osmotr` (prerendered page) with a Preact island `QuizIsland` (`client:load`): question card, answer buttons Да / Частично / Нет, back button, progress, live transom via `attachTransom`. Logic only from `@beda/core`.
2. On the 12th answer: compute final nails, `encode` → navigate to `/osmotr/r/<code>`. Keep the answers in `sessionStorage` so "back" from the result can resume; clear on restart.
3. `POST /api/quiz/attempts` in the Rust API: body `{ code, source }` (serde, reject unknown fields); validate the code (same rules as `decode` in core — port the 12-line validator, with a test vector shared from a JSON fixture used by both test suites); insert into `app.quiz_attempts` via `sqlx::query!`; rate limit 10/min per IP with `governor`; respond 204. Fire-and-forget from the island with `navigator.sendBeacon` fallback to `fetch(..., { keepalive: true })`. Failure never blocks navigation.
4. `/osmotr/r/[code]` with `prerender = false`: `decode` (invalid → 404); `<meta name="robots" content="noindex, follow">`; canonical to `/osmotr`; OG tags pointing at `/og/osmotr/<code>.png` (the files arrive in S13 — link them now). Content: transom in final state (server-rendered), class title and text, six chips, share text, buttons «Скопировать ссылку» (small island using Clipboard API with a visible status), «Пройти заново» → `/osmotr`, and the three actions from `pickActions`. For the special П+О case show its text.
5. Reveal animation on the result page: if the visitor came from the quiz (flag in `sessionStorage`), start from the live state and reveal letters one by one (500 + 520·i ms); otherwise show the final state instantly (shared links).
6. «Прибить буквы обратно» button: saves final nails to `localStorage` key `yacht-beda-v1` (same shape as the prototype) and links to `/moya-yahta` (built in stage 2; until then the button is hidden behind a flag).
7. Tests: island reducer logic (pure) in core or a local module; Rust handler tests (`tower::ServiceExt::oneshot`) for validation and rate limit; the shared fixture of valid and invalid codes passes in both Vitest and `cargo test`.

## Out of scope
No accounts, no server-side tracker, no share image generation (S13).

## Verify
- Full pass on mobile and desktop; back button works mid-quiz; resume after returning from result.
- Shared link opened in a private window shows the final state without animation.
- Invalid code → 404. `quiz_attempts` gets a row per completion.
- `task check` green.

## Done when
- [ ] Quiz island
- [ ] Result page SSR, noindex, OG tags
- [ ] Attempt recorded, non-blocking
- [ ] PROGRESS.md updated
