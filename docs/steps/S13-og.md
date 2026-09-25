# S13 — Share images (729 prebuilt)

Stage 1 · Depends on: S10 · Medium

## Goal
Every possible quiz result has a prebuilt 1200×630 PNG at `/og/osmotr/<code>.png`, rendered at build time from the ShareCard design, plus default OG images for the home page and articles.

## Read first
- `archive/design/canvas/ShareCard.dc.html`
- Spec «Шеринг и OG-картинки»
- satori and `@resvg/resvg-js` docs (supported CSS subset; transforms)

## Tasks
1. `apps/web/scripts/og.ts`: for each code from `allCodes()`, build the ShareCard layout (transom with states, class title from `classify`, line «ПО есть. Победы нет. А у тебя?», site address) as satori elements; render to SVG → PNG with resvg; write to `apps/web/public/og/osmotr/<code>.png`. Fonts loaded from the Fontsource files (TTF/WOFF as satori needs).
2. First spike: render the three codes `222222`, `002222`, `112020` and check hanging/fallen letter rotations. If satori's transforms are wrong, draw rotated letters as SVG `<text transform="rotate(...)">` inside an `<svg>` element instead of CSS transforms. Record the choice in PROGRESS.
3. Run the script in `build` before `astro build` via Turborepo (`og` task with inputs = script + core + fonts, outputs = `public/og/**`) so it is cached and not re-rendered when nothing changed. Report build time.
4. Default images: `/og/default.png` (home) and `/og/bukvy/<slug>.png` (one per article).
5. Result pages already point at the files (S10); add `og:image:width/height`, `og:image:alt`.
6. Keep total size reasonable: optimise PNGs (report total MB). If it exceeds ~50 MB, switch to a palette PNG or JPEG and note it.

## Out of scope
Dynamic OG for UGC (stage 3).

## Verify
- `ls apps/web/public/og/osmotr | wc -l` → 729.
- Paste a result link into Telegram and one more messenger → correct preview (screenshot in PROGRESS).
- `task check` green; CI build time increase reported.

## Done when
- [ ] 729 images generated and cached in the pipeline
- [ ] Default and article images
- [ ] Previews verified in a messenger
- [ ] PROGRESS.md updated
