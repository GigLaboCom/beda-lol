# 03 — Integrating the bench animation into the yacht scene

The yacht (`yacht-threejs.html`) still runs the v1 letter mechanic: full-canvas planes, no fixings, instant ballistic fall. The bench (`letter-anim-debug.html`) has the target behaviour. This is the plan to merge them. Not done yet.

## 1. Geometry mapping

The bench was built in the same orientation as the transom on purpose:

| Bench | Yacht |
|---|---|
| board face at `x = 0`, viewer at `−x` | transom plane at `x = −L/2 = −5`, viewer astern at `x < −5` |
| `FACE = −0.005` | `NX = −L/2 − 0.03` |
| `Y0 = 0.14` | `NY = 0.72` |
| `FLOOR = −0.88` | shelf top `−1.80` |
| screen-right = `+z` | screen-right = `+z` (same) |

So the port is a translation, no rotation. Everything in the bench that is world-aligned (pivot, fixings, `toLocal`) stays valid.

## 2. Space check

At `y = 0.72` the transom half-width is ≈ 0.97. The bench word is laid out with `H = 0.31`, `GAP = 0.045`; with glyph-cropped widths the total is roughly 1.5–1.7 depending on the font. That fits inside ±0.97 with margin, but verify at runtime:

```js
console.assert(total/2 < beamAt(0.72) - 0.05, 'name wider than transom');
```

If it doesn't fit, scale `H` down rather than squeezing `GAP`.

The **О topple** sweeps an arc of radius `|off|` (≈ 0.14) around its lower-left rivet — up to ~0.28 across. Near the transom edge that arc can leave the transom outline. Keep `lean ≥ 0.02` so it passes in front of the neighbours, and check it visually from the stern and from a 3/4 angle.

## 3. What to port

1. `glyph`, `ink`, `snap`, `mountPoints`, `toLocal` — as is.
2. `makeLetter` → parent pivots and ghosts to `nameGroup` instead of `root`.
3. Fixing geometries and the shared `metal` material.
4. `CFG`, `step`, `popNail`, `toFall`, `stepLoose`.
5. In the yacht's animation loop call `rigs.forEach(r => step(r, dt)); stepLoose(dt);` in place of the current `stepLetters(dt)`.
6. Replace `FLOOR` with the shelf top. Note that falling letters will pass the stern stand post and the rudder; there are no collisions, so choose an initial `v.x` that carries them clear aft (`−0.4` or more instead of `−0.2`).

## 4. What to remove from the yacht

- `letterTexture`, the old per-letter meshes and ghosts, `knock`, `restoreLetters`, `stepLetters`.
- The v1 constants `NW`, `NY`, `NX` (replace with the bench's layout).

## 5. Triggers and UI

- Raycast click / tap: keep the existing picking, but target `rigs.map(r => r.mesh)` and call `start(rig)` for the hit.
- "Отколоть «ПО»": `start(rigs[0])`, then `start(rigs[1])` after ~0.6–1.0 s so П is mid-swing when О begins to topple — two different motions on screen at once is the payoff of the gag.
- "Прибить обратно": the bench's `reset()`.
- The tuning sliders do not belong in the yacht HUD. Keep them in the bench; copy the final numbers into `CFG` by hand.

## 6. Per-letter configuration

Move from `i === 1 ? 'rivets' : 'corner'` to an explicit table so future letters (see `02-letter-animation.md` §11) are data, not branches:

```js
const MOUNTS = { 'П':'corner', 'О':'rivets', 'Б':'corner', 'Е':'corner', 'Д':'corner', 'А':'corner' };
```

## 7. Verification checklist

- [ ] From "Вид с кормы", fixings sit on the letter strokes for all six letters.
- [ ] П swings four times and falls clear of the rudder.
- [ ] О topples without crossing Б visibly.
- [ ] Ghost imprints appear when a letter starts moving, not when it lands.
- [ ] Reset restores all fixings (count: 24 meshes under pivots).
- [ ] Mirroring still excludes `nameGroup` (letters readable, not reversed).
- [ ] Mobile tap picks letters; a drag does not.
