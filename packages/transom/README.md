# @beda/transom

The name board with nailed, hanging and fallen letters. Server markup looks right without
JavaScript; the client controller takes the same markup over and animates state changes.

```astro
---
import Transom from '@beda/transom/Transom.astro';
---
<Transom letters={['П','О','Б','Е','Д','А']} nails={[1, 0, 4, 4, 4, 4]} id="hero" />
<script>
  import { attachTransom } from '@beda/transom/client';
  const tr = attachTransom(document.getElementById('hero')!);
  tr.set([1, 0, 0, 4, 4, 4]);                 // animated
  tr.set([4, 4, 4, 4, 4, 4], { animate: false });
</script>
```

| Export | What |
| --- | --- |
| `renderTransom({ letters, nails?, size?, label?, id? })` | HTML string with the state applied, `role="img"` + Russian `aria-label` |
| `attachTransom(root)` | `{ letters, nails, set(nails, { animate }) }` |
| `MOUNTS`, `DEFAULT_MOUNT` | nail positions (em) and hang angles; index 0 is the hinge |
| `Transom.astro` | Astro wrapper; imports `transom.css` |
| `transom.css` | all sizes in `em` of `--ts`; colours from `@beda/tokens` |

Nails per slot: ≥ 2 on the board, 1 hanging (`.hang`), 0 fallen (`.fall`). The swing plays
only when a letter starts hanging (`.swinging`, removed on `animationend`), so server-rendered
hanging letters stay still. Reduced motion disables transitions and the swing.

## Glyph data (S08b)

Letter geometry is generated from the font, not tuned by hand. `renderTransom` still uses
`MOUNTS` until S08c switches it over.

| File | What |
| --- | --- |
| `glyphs.config.ts` | **Every generator input**: font files, family and weight, charset rules, core set, raster size, alpha thresholds, rivet letters, hinge overrides, fixed-glyph nails |
| `src/glyphs.core.gen.ts`, `src/glyphs.ext.gen.ts` | generated tables: path, advance, ink box, nails (hinge first), centroid, hang, drop, and per break the piece polygon, its centroid and drop, the remainder's nails and hang. Glyph units, 1000 per em, y down, baseline at 0 |
| `src/glyphs.ts` | `glyphFor(char)`, `needsExt(text)`, `loadExt()` (ext is a dynamic import) and the types |
| `src/pieces.ts` | break pieces as fractions (x of the advance, y of the ink box), keyed by `BreakKey` from `@beda/core` |
| `src/geometry.ts` | board sizes in em, drop formulas, deterministic fall drift and tilt |
| `src/timeline.ts` | animation timeline in ms (doc 09 §4) |
| `src/glyph-analysis.ts` | pure analysis for the generator: raster, ink box, nail snapping, centroids, hang angle |
| `scripts/gen-glyphs.ts` | writes the tables and `packages/core/src/charset.gen.ts` (`BOARD_CHARSET`, `FALLING`) |

Regenerate with `task transom:glyphs` (or `pnpm --filter @beda/transom gen`) and commit the
output. `glyphs.test.ts` fails when the committed files differ from a fresh run, and pins the
hang angles and the font-swap guards: every piece cuts ink, every remainder stays one piece of
metal, every nail sits outside its piece.

**Change the font:** edit `glyphs.config.ts` (and `packages/tokens`, a test checks they match),
run `task transom:glyphs`, then check the breaks by rendering on `/dev/animacii`: the pieces
are tuned to the letter shapes.
