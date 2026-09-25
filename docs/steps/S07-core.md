# S07 — packages/core: quiz and name game logic

Stage 1 · Depends on: S03 · Medium

## Goal
All game logic from the prototype lives in a framework-free, fully tested TypeScript package: quiz questions and scoring, class selection, actions, result-code codec, and the name game search.

## Read first
- `archive/site/yacht-beda-site.html` — the `<script>`: `WORD`, `PILLARS`, `QUESTIONS`, `ACTS`, `STEPS`, `liveCounts`, `scores`, `finalCounts`, class selection inside `showResult`, `FUNNY`, `STOP`, `findRemoval`
- `docs/05-site.md` §4 (quiz), §5 (name game)
- `docs/tactics/01-osmotr-sudna.md`, `docs/tactics/02-kak-nazovesh.md`
- Spec «Шеринг и OG-картинки» (result code)

## Tasks
1. `packages/core` (ESM, TypeScript strict, no runtime deps). Modules:
   - `letters.ts`: `WORD = ['П','О','Б','Е','Д','А'] as const`, `Letter` type, `PILLARS` (name, description).
   - `quiz.ts`: `QUESTIONS` (letter, text, hint), `Answer = 0 | 0.5 | 1`, `liveNails(answers)`, `scores(answers)`, `finalNails(scores)`, `classify(finalNails)` returning `{ id, title, text }` with ids `flagship | schooner | beda | slipway | beda-po` (the special П+О case first, exactly as the prototype orders the checks), `pickActions(scores)` (≤ 3 weakest, fallback О, Д, Б). Copy the Russian texts verbatim from the prototype.
   - `result-code.ts`: nails → state (≥2 → 2, 1 → 1, 0 → 0); `encode(states) → "002212"`, `decode(code) → states | null` with strict validation (length 6, digits 0–2); `allCodes()` generating all 729.
   - `share.ts`: `shareText(states)` → «Прошёл осмотр судна: у меня __БЕДА. А у тебя?» (fallen letters as `_`).
   - `namer.ts`: `normalizeName(input)` (collapse spaces, trim, uppercase, max 14 chars), `FUNNY`, `STOP`, `findRemoval(name)` with the subsequence algorithm (longest funny word wins, must remove at least one letter; fallback: first two letters, one if ≤ 3 letters; stop-list check on fallback), `verdict(result)` with Russian plural handling (1 / 2–4 / 5+).
   - `tracker.ts`: `STEPS` per letter (4 each), `nailState(count)`.
   - `index.ts` re-exports.
2. Unit tests (Vitest), at least:
   - every question maps to a letter, two per letter, in word order;
   - `finalNails` mapping for scores 0, 0.5, 1, 1.5, 2;
   - `classify` for: all yes → flagship; П and О zero, rest ≥ 0.5 → beda-po; 4 mounted → schooner; 2 mounted → beda; 0 mounted → slipway;
   - codec round-trip for all 729 codes and rejection of bad codes (`"00221"`, `"003212"`, `"abcdef"`);
   - `findRemoval` table: ПОБЕДА → беда (removes 0,1), БАГТРЕКЕР → баг, DEADLINE → dead, ТАСК МЕНЕДЖЕР → ад, ТРЕКЕР → fallback «ЕКЕР»; plural forms 1, 2, 5, 11.
3. Package README: API list and a note that texts are copied from the prototype and are the product's copy, not placeholders.

## Out of scope
No UI, no transom, no storm game (stage 5).

## Verify
- `pnpm --filter core test` green, coverage for `quiz.ts`, `result-code.ts`, `namer.ts` ≥ 90 % lines.
- `task check` green.

## Done when
- [ ] Package with the modules above
- [ ] Tests from the list pass
- [ ] Behaviour matches the prototype on the sample inputs
- [ ] PROGRESS.md updated
