# @beda/core

Framework-free game logic for beda.lol. No DOM, no framework, no runtime dependencies.
Imported as TypeScript source (`exports: ./src/index.ts`) by the web app and scripts.

| Module | API |
| --- | --- |
| `letters.ts` | `WORD`, `Letter`, `PILLARS`, `letterIndex()` |
| `quiz.ts` | `QUESTIONS`, `Answer`, `liveNails()`, `scores()`, `finalNails()`, `classify()` → `flagship \| schooner \| beda \| slipway \| beda-po`, `CLASSES`, `ACTS`, `pickActions()` |
| `result-code.ts` | `nailsToStates()`, `statesToNails()`, `encode()`, `decode()`, `isValidCode()`, `allCodes()` (729) |
| `share.ts` | `shownWord()`, `shareText()` |
| `namer.ts` | `normalizeName()`, `FUNNY`, `STOP`, `findRemoval()`, `fallenLetters()`, `verdict()` |
| `tracker.ts` | `STEPS`, `nailState()` |

`fixtures/result-codes.json` holds valid and invalid result codes; the Rust API's validator is
tested against the same file.

**Texts are the product's copy**, copied verbatim from the prototype
(`archive/site/yacht-beda-site.html`) — not placeholders. Change them deliberately.

Known limitation kept from the prototype: in the `findRemoval` fallback the remainder is a
suffix of the name, so dropping one letter instead of two cannot remove a stop word; the stop
list only changes how many letters fall.

```sh
pnpm nx test @beda/core        # Vitest with coverage (≥ 90 % lines on quiz, result-code, namer)
pnpm nx typecheck @beda/core
```
