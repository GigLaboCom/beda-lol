# S08 — packages/transom: board component

Stage 1 · Depends on: S03 · Medium

## Goal
The transom (name board with nailed, hanging and fallen letters) is a reusable package: server-side HTML that looks right without JS, and a client controller that animates state changes exactly like the prototype.

## Read first
- `archive/site/yacht-beda-site.html` — CSS under `/* ---------- transom ---------- */`, JS `MOUNTS`, `DEFAULT_MOUNT`, `buildTransom`, `setTransom`
- `docs/05-site.md` §3 (units, mounts, motion, accessibility)
- `docs/02-letter-animation.md` §7 (why О topples through ~124°)

## Tasks
1. `packages/transom/src/transom.css`: the prototype CSS for `.transom-wrap`, `.transom`, `.shelf`, `.slot`, `.g`, `.ghost`, `.hole`, `.nail`, states `hang`/`fall`, `swing` keyframes, `.still`, reduced-motion rules. All sizes in `em` driven by `--ts`. Colours only via tokens.
2. `src/mounts.ts`: `MOUNTS` and `DEFAULT_MOUNT` from the prototype (hinge first, angles in degrees as numbers).
3. `src/render.ts`: `renderTransom({ letters, nails, size?, label? }): string` — pure function returning the same DOM the prototype builds, with the state already applied (`hang`/`fall` classes, `.nail.off`), `role="img"` and a Russian `aria-label` («Надпись на транце: …»). Deterministic fall offsets per slot index as in the prototype. Escape every letter.
4. `src/client.ts`: `attachTransom(root: HTMLElement)` returns `{ set(nails, { animate }) }`. It reads the existing markup (no rebuild), toggles classes like `setTransom`, restarts the swing animation on entering `hang`, disables transitions for non-animated updates (`.still` + two rAFs), updates `aria-label`.
5. `src/Transom.astro`: wrapper that renders `renderTransom` output; props `letters`, `nails`, `size`, `id`.
6. Tests with Vitest + happy-dom:
   - render: 6 slots for ПОБЕДА, 24 nails, `fall` on count 0, `hang` on count 1, space slot for `' '`, aria-label text;
   - client: `set` toggles classes and `.off` on the right nails; `animate: false` adds `.still`.
7. Visual check page `apps/web/src/pages/dev/transom.astro` (excluded from prod build or `noindex` + not linked): all combinations for П and О (4, 1, 0 nails) and a long Latin name.

## Out of scope
No 3D (stage 6). No glyph-ink snapping (known issue in `docs/05-site.md` §10, later).

## Verify
- Tests green.
- `/dev/transom` at 375 px and 1280 px: nails sit on the strokes for Playfair Display; hanging П at ~37°, О toppled clockwise ~124° around its lower-left rivet; fallen letters rest on the shelf.
- With JS disabled the states still render correctly.

## Done when
- [ ] CSS, mounts, render, client, Astro wrapper
- [ ] Tests pass
- [ ] Visual check page reviewed
- [ ] PROGRESS.md updated
