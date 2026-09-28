# 09 — Transom falls component (`archive/src/transom-falls.html`)

A single engine for the name board: a letter either **falls whole** (nails pop, it swings on the last one, drops to the shelf) or **loses a piece** (a chip shudders and falls, the remainder reads as another letter). Both kinds mix freely within one inscription. The page demos 31 gags (15 Russian, 16 English) with a language filter, a stage with play/reset, slow motion and a debug overlay.

Live: https://claude.ai/artifact/58T11EF1fdzaXgPgDduitb. Pun catalogue: `docs/tactics/10-otval-katalog.md`.

## 1. Data

Each gag is one object:

```js
{ lang:'en', text:'GOLD RUSH', result:'COLD PUSH',
  ops:[ {i:0, brk:'G>C'}, {i:5, brk:'R>P'} ],
  meta:'…', joke:'…' }
```

- `i` — character index in `text` (spaces count).
- `fall:true` — the whole letter falls.
- `brk:'X>Y'` — a piece breaks off letter X, the remainder reads as Y. Key must exist in `PIECES`.

A test in the archive tooling applies the ops to `text` and checks the result equals `result`; all 31 pass.

## 2. Break masks — `PIECES`

A polygon per break type. Coordinates are fractions:

- `x` — of the glyph advance width (so 0…1 spans the letter's cell horizontally; values slightly outside are fine);
- `y` — of the glyph's ink box, top to bottom, **including diacritics** (so for Й/Ё the top 0…0.19 is the breve/dots).

Everything inside the polygon is the piece; everything else stays. Masks were tuned by rendering Playfair Display Black (`archive/design/puns/*.png`):

| Key | Piece | | Key | Piece |
| --- | --- | --- | --- | --- |
| R>P | leg | | Т>Г | left half of the bar |
| B>P | lower bowl | | Д>Л | base with feet |
| G>C | spur | | Ё>Е | dots |
| O>C | right arc chip | | Й>И | breve |
| E>L | upper and middle arms | | Б>Ь / Б>Г | top flag / lower bowl |
| E>F | lower arm | | В>Р | lower bowl |
| W>V | left half | | П>Г | right stem |
| | | | Щ>Ш, Ы>Ь, Ж>К, О>С | tail, right stem, left half, arc chip |

M>N is deliberately absent: in this typeface the remainder does not read as N.

## 3. Glyph pipeline (runtime, per rendered font)

Nothing depends on hand-placed coordinates per letter. For each character the engine:

1. Draws it on an offscreen canvas at raster size `S` px/em with `font: 900 S px "Playfair Display"`, baseline at `0.95em`, cell height `1.25em`, side padding `0.1em`.
2. Reads the alpha channel and computes the ink box.
3. Builds the piece polygon in canvas pixels from `PIECES` (if the op is a break).
4. **Nails:** four targets in ink-box fractions — corners inset 12 % for most letters; for round letters (`O Q C G S О С Э Ю Ф`) two per side at `centre ± 0.40w, ± 0.26h`. Each target snaps to the nearest pixel with alpha > 160 **outside the piece**. `nails[0]` is the hinge (top-left, or left-bottom for round letters).
5. **Centroid** of the remaining ink (piece excluded).
6. **Hang angle**, so the centroid ends straight below the hinge: `θ = atan2(dx, dy)` in degrees, with `(dx, dy) = centroid − hinge` in screen coordinates (y down), applied as CSS `rotate(θ)` about the hinge. П ≈ 37°, round letters on the lower-left rivet topple past 120°, А barely moves.
7. **Canvases:** ghost (weathered wood, whole glyph), main (whole glyph or remainder via `destination-out`), ghost piece and piece (clipped to the polygon). Brass fill with a 0.025em dark offset for the engraved look.

If the web font fails to load, the fallback serif is measured instead, so nails, masks and angles stay consistent with what is drawn.

## 4. Animation timeline

All durations scale with `--k` (1 normal, 2.5 slow). Ops start 520 ms apart.

| Kind | t, ms | Event |
| --- | --- | --- |
| fall | 0, 120, 240 | nails 3, 2, 1 pop (drop 1.3em and fade, 550 ms) |
| fall | 420 | `hang`: rotate to θ with the damped `swing` keyframes (×1.42, ×0.70, ×1.20, ×0.88, ×1.05, ×1.00), 2.6 s |
| fall | 3020 | last nail pops; `fall`: translate to the shelf + small tilt, 750 ms, accelerating curve |
| break | 0 | `crack`: 450 ms shudder of the piece |
| break | 470 | `pdrop`: piece falls to the shelf with a tumble, 800 ms |

Ghost imprints fade in when the letter or piece starts to move. `prefers-reduced-motion` jumps to the final state. `finalState()` renders the end state without animation (used in the gallery).

## 5. API

```js
var t = Transom(hostEl, gag, { min, max, res });  // builds DOM, fits font size to host width
t.play(k, onDone);   // run the timeline; k — time scale
t.reset();           // nail everything back
t.finalState();      // show the result instantly
t.debug(true);       // overlay: piece polygon (red), nails (blue), centroid (green), cell box
t.fit();             // refit to host width (call on resize)
```

`res` is the raster size per em: 240 on the stage, 96 in gallery cards. Canvases are per slot and per layer, so resolution matters for memory; the debug layer is created lazily.

## 6. Accessibility

- The board is `role="img"` with `aria-label` «Надпись на транце: …», updated to the result after the animation.
- Letters are canvases, so the text is not selectable; the label carries it.
- Buttons are real buttons, focus is visible, status line is `aria-live`.

## 7. Known issues

1. **Falling letters un-rotate.** The fall transform uses a small tilt, not the hang angle plus tilt, matching the site transom. Continuous rotation would look more physical but can push letters through the shelf; left as is.
2. **No collisions.** Pieces and letters may overlap on the shelf.
3. **Masks are font-specific.** Another typeface needs the break table re-checked.
4. **Not seen in a live browser** by the author of the component; use the debug overlay to verify placement.

## 8. Integration

- Port into `packages/transom` (steps S08b–S08d, see ROADMAP). Superseded detail: the repo does **not** keep a second, CSS-only transom next to this engine. One engine renders SSR (final state, no JS) and animates on the client, with letter geometry generated at build time from the font instead of measured at runtime.
- Add `brk` ops to `@beda/core` data for quiz results and «Верфь» submissions (tactic 09 #12).
- For 3D (S37): same masks, applied to the letter texture as two alpha-masked planes.
