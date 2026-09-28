# @beda/transom

The name board: brass letters nailed to planks, drawn as SVG paths from the font. A letter
hangs on its last nail, falls onto the shelf, or loses a piece and turns into another letter
(Д → Л). The server markup shows the state without JavaScript, CSS or fonts, and the client
controller takes the same markup over and animates it.

```astro
---
import Transom from '@beda/transom/Transom.astro';
import { fromOps } from '@beda/transom';
---
<Transom letters={['П','О','Б','Е','Д','А']} nails={[1, 0, 4, 4, 4, 4]} id="hero" />
<Transom state={fromOps('ДЕНЬГИ', [{ i: 0, brk: 'Д>Л' }, { i: 4, fall: true }])} id="gag" />
<script>
  import { attachTransom } from '@beda/transom/client';
  const hero = attachTransom(document.getElementById('hero')!);
  hero.set([1, 0, 0, 4, 4, 4]);                   // animated; nails per slot (the quiz)
  hero.set([4, 4, 4, 4, 4, 4], { animate: false });
  const gag = attachTransom(document.getElementById('gag')!);
  gag.play([{ i: 0, brk: 'Д>Л' }, { i: 4, fall: true }], { onDone: () => {} });
</script>
```

## API

| Export | What |
| --- | --- |
| `renderTransom({ letters, nails?, breaks?, broken?, state?, label?, labelText?, id?, idPrefix?, highlight?, debug?, standalone? })` | SVG markup string with the state applied, `role="img"` and an `aria-label`. `standalone: { palette }` (from `readTokens()` in `@beda/tokens/read`) gives a self-contained `<svg>` with the colours in a `<style>`, for resvg and share images |
| `CLASS_TOKENS` | board class → colour token, shared by `transom.css` and the standalone style (a test checks) |
| `attachTransom(root)` | `{ letters, nails, state, set(state \| nails, { animate }), play(ops, { k, onDone }), reset(), finalState(ops?), debug(on), destroy() }` |
| `fromNails`, `fromOps`, `finalOf`, `transomLabel`, `BoardState`, `SlotState` | the state model: nails per slot (0–4) and a broken flag; `breaks[i]` is the piece slot `i` can lose, fixed at render time |
| `boardWidthEm(letters)`, `BOARD_HEIGHT_EM`, `fitSize(letters, px, { min, max })` | board size in em, and the font size that fits a width |
| `glyphFor`, `needsExt`, `loadExt` | glyph data (see below); the namer calls `loadExt()` for accented Latin, other Cyrillic letters and rare symbols |
| `TIMELINE` (`@beda/transom/timeline`), geometry constants, `PIECES` | numbers, in one place each |
| `Transom.astro` | Astro wrapper; imports `transom.css` |

Nails per slot: ≥ 2 on the board, 1 hanging, 0 fallen. Punctuation and symbols never fall.
`play` follows docs/09 §4: nails 3, 2, 1 pop, the letter swings onto its hinge, then falls;
a break shudders and the piece drops. Reduced motion jumps to the end. Timers stop on
`reset()` and when the board leaves the page.

## How it is drawn

- Board-wide paint layers, because SVG has no z-index: imprints, holes, letters, pieces,
  nails (and the debug overlay). Each layer has one `<g class="slot iN">` per slot; state
  classes (`hang`, `fall`, `broken`, `swinging`, `crack`, `dim`) go on all of them.
- Each letter sits in nested groups `translate(hinge) > .main > translate(-hinge)`, so CSS only
  rotates about `0 0`. A remainder is clipped by an even-odd path, a piece by its polygon.
- Without JavaScript the final state is in `transform` attributes, which also serves resvg. The
  controller sets per-slot values from `data-v` (`--hang`, `--drop`, `--fx`, `--fr`, `--pfx`,
  `--pfr`, `--pdrop`) and durations from `TIMELINE` (`--t-*`) through CSSOM (a strict CSP allows
  no `style` attributes), then adds `.live`, and from there `transom.css` owns the state.
- Colours come only from `@beda/tokens`, by class. Sizes are em of `--ts` on `.transom-wrap`;
  inside the SVG one em is 1000 units.

## Glyph data

Letter geometry is generated from the font, not tuned by hand.

| File | What |
| --- | --- |
| `glyphs.config.ts` | **Every generator input**: font files, family and weight, charset rules, core set, raster size, alpha thresholds, rivet letters, hinge overrides, fixed-glyph nails |
| `src/glyphs.core.gen.ts`, `src/glyphs.ext.gen.ts` | generated tables: path, advance, ink box, nails (hinge first), centroid, hang, drop, and per break the piece polygon, its centroid and drop, the remainder's nails and hang. Glyph units, 1000 per em, y down, baseline at 0 |
| `src/glyphs.ts` | `glyphFor(char)`, `needsExt(text)`, `loadExt()` (ext is a dynamic import) and the types |
| `src/pieces.ts` | break pieces as fractions (x of the advance, y of the ink box), keyed by `BreakKey` from `@beda/core` |
| `src/geometry.ts` | board sizes in em, drop formulas, deterministic fall drift and tilt |
| `src/timeline.ts` | animation timeline in ms (doc 09 §4) and page choreography |
| `src/glyph-analysis.ts` | pure analysis for the generator: raster, ink box, nail snapping, centroids, hang angle |
| `scripts/gen-glyphs.ts` | writes the tables and `packages/core/src/charset.gen.ts` (`BOARD_CHARSET`, `FALLING`) |

Regenerate with `task transom:glyphs` (or `pnpm --filter @beda/transom gen`) and commit the
output. `glyphs.test.ts` fails when the committed files differ from a fresh run, and pins the
hang angles and the font-swap guards: every piece cuts ink, every remainder stays one piece of
metal, every nail sits outside its piece. `call-sites.test.ts` keeps `apps/web` on the public
API and free of board-word literals.

**Change the font:** edit `glyphs.config.ts` (and `packages/tokens`, a test checks they match),
run `task transom:glyphs`, then check the breaks by rendering on `/dev/animacii`: the pieces
are tuned to the letter shapes.
