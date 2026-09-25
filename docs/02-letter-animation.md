# 02 — Letter detach animation (`src/letter-anim-debug.html`)

A standalone test bench for the "letter falls off the transom" gag. The full word ПОБЕДА is mounted on a wooden board; **П** (nailed at the corners) and **О** (riveted along its oval) have working animations. Б, Е, Д, А are rigged with the default corner mount but no trigger is wired to them.

The bench exists so timings and physics can be tuned without the cost and camera distance of the full yacht scene. Integration into the yacht is described in `03-integration-plan.md`.

---

## 1. Scene layout

| Object | Geometry | Position | Notes |
|---|---|---|---|
| Board | Box 0.12 × 1.05 × 2.3 | centre `(0.06, 0, 0)` | front face at `x = 0`, facing `−x` like the transom |
| Floor | Box 4 × 0.2 × 6 | top at `y = FLOOR = −0.88` | extends forward (`−x`) so falling letters land in view |
| Letters | cropped planes (§3) | plane at `x = FACE = −0.005`, centre at `y = Y0 = 0.14` | 5 mm proud of the board |
| Ghosts | same planes | `x = FACE + 0.004` | between letter and board |
| Sun | Directional 1.1 | `(−4, 6, 3)` | 1024² shadow map, ±3 frustum |

Axes are the same as the yacht (`01-yacht-model.md` §2): the board plane is `y–z`, the viewer is on the `−x` side, screen-right is `+z`.

---

## 2. Configuration

All tunables live in one object at the top of the script and are bound to sliders:

```js
const CFG = { shudder:0.55, period:0.85, swings:4, damping:0.62, lean:0.02, speed:1, gravity:9.8 };
```

| Key | Slider range | Meaning |
|---|---|---|
| `shudder` | 0.10 – 1.50 s | duration of the pre-release tremble in which the secondary fixings pop |
| `period` | 0.40 – 1.60 s | period `T` of the damped swing |
| `swings` | 1 – 8 (integer) | number of full periods before the last fixing gives way |
| `damping` | 0.10 – 2.00 1/s | exponential decay rate `λ` |
| `lean` | 0 – 0.08 m | how far the hanging letter drifts off the board during the swing |
| `speed` | ×0.10 – ×2.00 | global time scale; multiplies `dt`, so it slows physics too — use ×0.25 to inspect |
| `gravity` | — | 9.8, not exposed |

Default total runtime: 0.55 + 0.85 × 4 + fall ≈ 1 s → **about 5 s**.

---

## 3. Glyph pipeline

### 3.1 Why cropping is necessary

A letter is drawn onto a 128 × 128 canvas and used as a texture on a plane. With Georgia Bold at 100 px the cap height is roughly 70 px, and horizontal extent is smaller still, so the glyph sits in the middle of the square with a wide transparent margin. The first version of the bench placed fixings at the plane's corners with a fixed inset — i.e. in the transparent margin. On П they appeared in the gap between the legs, on О inside the hole.

### 3.2 `glyph(ch, fg, outline)`

1. Draw: `font = 'bold 100px Georgia, "Times New Roman", serif'`, centred at `(64, 68)`; stroke 9 px in `outline`, then fill in `fg`.
2. Read `getImageData(0, 0, 128, 128)` and scan alpha. Pixels with `alpha > 128` count as ink.
3. Record the ink bounding box `x0, y0, x1, y1` (inclusive), width `w = x1 − x0 + 1`, height `h = y1 − y0 + 1`.
4. Create a `CanvasTexture` and crop it to the box:

```js
t.offset.set(x0 / 128, 1 - (y1 + 1) / 128);
t.repeat.set(w / 128, h / 128);
```

The `y` term is flipped because canvas rows grow downward while texture `v` grows upward: the bottom row of ink `y1` maps to `v = 1 − (y1 + 1)/128`.

5. Return `{ tex, img, x0, y0, x1, y1, w, h }`. The raw `img` is kept for snapping (§4).

The ghost uses a second `glyph()` call with weathered colours (`#8a6038` / `#5a3d25`). Shape and bounding box are identical because only colours differ.

### 3.3 Plane size and word layout

Letter height is fixed at `H = 0.31`. Width follows the glyph's aspect: `gw = H · w / h`. Every letter therefore has its own width. The word is laid out by cumulative sum:

```
total = Σ gw_i + GAP · (n − 1)          GAP = 0.045
z_i   = −total/2 + Σ_{k<i}(gw_k + GAP) + gw_i/2
```

---

## 4. Fixings (nails and rivets)

### 4.1 Mount types

| Mount | Letters | Head | Offset from letter face | Hinge (`pts[0]`) |
|---|---|---|---|---|
| `corner` | П, Б, Е, Д, А | flat cylinder r 0.009, length 0.03, axis along `x` | `x = −0.022` | top-left |
| `rivets` | О | sphere r 0.013 scaled `(0.45, 1, 1)` → dome | `x = −0.009` | bottom-left |

### 4.2 Target points — `mountPoints(g, mount)`

Targets are set in glyph pixel space as fractions of the ink box, then snapped.

**corner**, inset `iq = 0.10·w`, `ip = 0.10·h`:

| Index | Target | Role |
|---|---|---|
| 0 | `(x0 + iq, y0 + ip)` | top-left — **hinge**, holds until the fall |
| 1 | `(x1 − iq, y0 + ip)` | top-right |
| 2 | `(x0 + iq, y1 − ip)` | bottom-left |
| 3 | `(x1 − iq, y1 − ip)` | bottom-right |

For П all four land naturally on ink: the ends of the top bar and the feet of both legs.

**rivets**, from the centre `(cx, cy)`, offsets `dq = 0.40·w`, `dp = 0.26·h` (pixel `y` grows downward):

| Index | Target | Role |
|---|---|---|
| 0 | `(cx − dq, cy + dp)` | left-bottom — **hinge** |
| 1 | `(cx − dq, cy − dp)` | left-top |
| 2 | `(cx + dq, cy − dp)` | right-top |
| 3 | `(cx + dq, cy + dp)` | right-bottom |

Two left, two right, mirror-symmetric about the vertical centreline. The `0.40` horizontal offset aims at the thick side strokes of the О; `0.26` vertically keeps the pairs clear of the thin top and bottom arcs.

### 4.3 `snap(g, tq, tp)` — pull every fixing onto the metal

A brute-force nearest-ink search over the bounding box: for each ink pixel compute squared distance to the target and keep the minimum. Cost is at most `w · h ≈ 6 000` checks per point, 4 points per letter, 6 letters — negligible at load.

This makes placement **glyph-agnostic**: change the font or letter and fixings still land on the stroke. The trade-off is that snapping can pull two targets to nearby pixels on thin glyphs; if that happens, move the targets rather than adding logic.

### 4.4 From pixels to board coordinates

```js
toLocal([q, p]) = ( 0,
                    (0.5 − (p − y0)/h) · H,      // vertical  → y
                    ((q − x0)/w − 0.5) · gw )    // horizontal → z
```

Result is relative to the letter centre in the board's world-aligned axes, not the plane's own rotated axes. This is deliberate: the fixings and the letter are siblings under the pivot, and the pivot is world-aligned.

---

## 5. Rig structure

```
root
└── pivot (Group)       at (FACE, Y0 + hinge.y, z_i + hinge.z) — exactly on fixing 0
    ├── mesh            at off = −hinge, rotation.y = −π/2
    ├── nail[0]         at (x_head, 0, 0)            ← on the axis
    ├── nail[1..3]      at (x_head, p_k.y − hinge.y, p_k.z − hinge.z)
└── ghost               at (FACE + 0.004, Y0, z_i)   — a sibling of pivot, never moves
```

Rotating `pivot.rotation.x` swings the letter in the board plane around fixing 0 — the axis is world `x`, perpendicular to the board.

Rig object fields:

| Field | Meaning |
|---|---|
| `ch`, `mount` | letter and mount type |
| `pivot`, `mesh`, `ghost`, `nails[4]` | scene objects |
| `off` | vector from the hinge to the letter centre (≈ centre of mass) |
| `eq` | equilibrium angle, §7.1 |
| `state`, `t` | current phase and time in phase |
| `home` | mesh local position and quaternion, for reset |
| `pivotHomeX` | resting `x` of the pivot, for shudder and lean |
| `nail.userData.home` | each fixing's local transform, for reset |

---

## 6. State machine

```
 fixed ──start()──▶ shudder ──t ≥ CFG.shudder──▶ swing ──t ≥ period·swings──▶ fall
                      │ pops nails 1,2,3              │ ghost visible              │ pops nail 0
                      │                               │ lean ramps up              │ mesh reparented
```

`start(rig)` only acts from `fixed`. There is no explicit `landed` state; see Known issues.

### 6.1 `shudder`

```
k   = max(0, 1 − t / CFG.shudder)            // decays 1 → 0
a   = 0.005 · k
pivot.position.x = pivotHomeX + sin(90 t) · a
pivot.rotation.z = sin(67 t) · 2.5 a
```

Two incommensurate frequencies (90 and 67 rad/s) avoid a visibly periodic buzz. Secondary fixings pop at `t > CFG.shudder · (0.35, 0.55, 0.75)` — fixings 1, 2, 3 in that order. On exit the offsets are zeroed, the ghost imprint becomes visible (the letter is about to move and reveal it), and the state switches to `swing`.

### 6.2 Popping a fixing — `popNail(rig, i)`

The fixing is reparented to `root` at its current world position and pushed onto the `loose` list with velocity `(−0.5…−0.9, 0.6…1.0, ±0.25)` and random spin up to ±4 rad/s per axis. It then falls under the loose-body integrator (§8).

---

## 7. Swing

### 7.1 Equilibrium angle

The letter hangs on one fixing. Its centre of mass is at `off` from the axis. Hanging equilibrium is reached when `off` points straight down.

Rotation about `x` by `θ` maps `(y, z) → (y cos θ − z sin θ, y sin θ + z cos θ)`. Writing the offset as a polar angle in the `y–z` plane, `α = atan2(z, y)` (measured from `+y` towards `+z`), this rotation adds `θ` to `α`. Straight down is `α = π`. So:

```
eq = wrap( π − atan2(off.z, off.y) )          wrap(a) = atan2(sin a, cos a) ∈ (−π, π]
```

`wrap` picks the shorter way round.

**П** — hinge top-left, centre below and to the right: `off ≈ (−0.4 H, +0.4 gw)` → `eq ≈ 35–40°`. The letter tilts to hang like a sign on one nail.

**О** — hinge bottom-left, centre **above** and to the right: `off.y > 0`. The rest position is on the unstable side, so the letter topples through a large arc, around **120–145°** depending on the snapped rivet position. The live angle is shown in the panel; `showPivot` draws the arc from 0 to `2·eq`.

Earlier revisions hard-coded `EQ = atan(W/H)`, which is correct only for a corner hinge. The general formula is what made the О mount possible.

### 7.2 Motion law

```
θ(t) = eq · (1 − e^(−λt) · cos(ωt))            ω = 2π / T
```

Properties:

- `θ(0) = 0` — starts from the mounted pose.
- `θ → eq` as `t → ∞` — settles at hanging equilibrium.
- Overshoots `eq` on the first half-swing by up to `eq · e^(−λT/2)`, then oscillates around it with decaying amplitude.

This is a **kinematic** curve, not a simulated pendulum. Things it does not model and that are worth knowing if it ever looks wrong:

- **Initial velocity is not zero.** `θ'(0) = eq · λ`. With defaults that is ≈ 0.43 rad/s for П, ≈ 1.4 rad/s for О. For a true release from rest use `θ(t) = eq · (1 − e^(−λt)(cos ωt + (λ/ω) sin ωt))`, which has `θ'(0) = 0` exactly.
- **Period is not physical.** A real compound pendulum has `T = 2π √(I / (m g d))`, depending on the moment of inertia and hinge distance. Here `T` is a slider shared by both letters.
- **Large amplitude.** At О's ~130° the real pendulum is strongly non-linear, and starting near the unstable point it would hesitate before toppling. The formula starts moving immediately. If the О needs more drama, add a short "creep" phase with `θ` growing as `ε·(e^(t/τ) − 1)` before handing over to the damped curve.

### 7.3 Lean

```
pivot.position.x = pivotHomeX − CFG.lean · (1 − e^(−3t))
```

The hanging letter drifts towards the viewer by up to `lean`. Purely visual: without it, О's big arc cuts through neighbouring letters because all letters lie in almost the same plane.

### 7.4 Release

When `t ≥ period · swings`, the last fixing fails. Angular velocity at that instant is the analytic derivative:

```
θ'(t) = eq · e^(−λt) · (λ cos ωt + ω sin ωt)
```

Because `swings` is an integer, release always happens at `ωt = 2πn`, where `cos = 1`, `sin = 0`: `θ'` is small and the letter is at the far side of a swing. The fall therefore starts gently. To release mid-swing at maximum speed, end at `period · (swings + 0.25)`.

---

## 8. Fall and loose bodies

### 8.1 `toFall(rig, θ')`

1. Read the mesh's world position `wp` and quaternion `wq`.
2. Reparent the mesh to `root` and apply `wp`, `wq` — no visual jump.
3. Linear velocity from the rotation it had: `v = ω × r`, with `ω = (θ', 0, 0)` and `r = wp − pivot.position`. Add `v.x −= 0.2` so it peels away from the board.
4. Spin: `(θ', ±1, ±1.5)` rad/s — keeps the swing's rotation and adds tumble.
5. Pop fixing 0; set state `fall`.

The `root` group has identity transform, so pivot's local position equals its world position; if the bench is ever nested under a transformed parent, use `pivot.getWorldPosition()` instead.

### 8.2 Integrator — `stepLoose(dt)`

Semi-implicit Euler per loose body:

```
v.y −= g · dt
p   += v · dt
q    = Euler(w · dt) ⊗ q          // world-space incremental rotation
```

Building the increment from Euler angles is only accurate for small `dt · |w|`; with `dt ≤ 0.05` s and `|w| ≤ ~4` rad/s it is fine for visuals.

**Ground contact** when `p.y ≤ FLOOR + 0.3·r` and falling (`r` = 0.012 for fixings, `H/2` for letters):

- if `|v.y| > 0.5`: bounce — `v.y *= −0.3`, `v.x, v.z *= 0.6`, `w *= 0.5`;
- else settle — snap `p.y = FLOOR + 0.008`, zero velocity; letters are laid flat with `rotation = (−π/2, 0, random)` (face up); remove from `loose`.

### 8.3 Reset

Clears `loose`, then for every rig: zeroes pivot rotation and offset, reparents the mesh and every fixing back under the pivot with their stored local transforms, hides the ghost, sets `fixed`.

---

## 9. UI

| Control | Action |
|---|---|
| "Отколоть" | `start(sel)` for the selected letter |
| "Сброс" | reset everything |
| «П» — гвозди по углам / «О» — клёпки по овалу | select the rig; active button gets a gold border; the helper is rebuilt for it |
| sliders | write into `CFG` live, including mid-animation |
| "показать ось и траекторию" | cyan axis through the hinge and the arc from 0 to `2·eq` of the centre of mass |
| status line | selected rig's `state`, `t` in phase, `pivot.rotation.x` in degrees |

Camera: orbit around `(−0.1, 0.05, 0)`, starts looking straight at the board from `−x`. Drag / wheel / pinch as in the yacht scene; `φ ∈ [0.2, 1.7]`, `r ∈ [1.2, 9]`.

---

## 10. Known issues

1. **No `landed` state.** After the letter settles, state stays `fall`; `start()` is blocked until reset. Add `rig.state = 'landed'` in the settle branch (letters can be matched via a back-reference from the loose body to the rig).
2. **Centre-based ground test.** Letters test their centre against `FLOOR + 0.3·H/2`. A letter tumbling edge-down can dip into the floor by up to ~0.1 before settling. Proper fix: test the four transformed plane corners.
3. **No collisions** between letters, fixings, board or each other. Letters falling close to the board can intersect its lower edge if `lean` is 0.
4. **Settle snap.** Laying flat is instantaneous. For polish, slerp the quaternion to the flat pose over ~150 ms.
5. **Slider changes mid-swing** rescale `ω` and `λ` of the running curve, causing a jump. Acceptable for a bench.
6. **Font fallback** moves the snapped fixings (they will still be on ink, just elsewhere).
7. **Speed slider** multiplies `dt` after the 50 ms wall-clock clamp, so at ×2 a single simulation step can reach 100 ms. Fine visually; clamp the scaled value instead if bounces start to tunnel through the floor.

---

## 11. Adding the remaining letters

Each letter needs a mount and, optionally, its own failure sequence. Suggested gags so the four don't repeat П and О:

| Letter | Mount idea | Motion |
|---|---|---|
| Б | top and bottom of the stem only | the bowl side swings out like a door on a vertical axis (rotate about `y`, not `x`) |
| Е | three nails on the spine | arms fall first as separate pieces (split the glyph into two textures) |
| Д | two feet | slides down a few cm, catches, then drops — a "stick-slip" phase |
| А | apex nail only | spins around the apex (full rotations, `eq` never reached — very low damping) |

Structurally this means: (a) let `mountPoints` return an axis as well as points (for Б), (b) allow a `phases` array per rig instead of the fixed shudder → swing → fall chain.
