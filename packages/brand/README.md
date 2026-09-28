# @beda/brand

Brand sources for beda.lol and the favicon / app-icon set generated from them.

| File | What |
| --- | --- |
| `src/tile.svg` | **The source.** The tile mark (24×24): first `<rect>` = background, the rest = the mark |
| `src/tile.ts` | Parses the source and derives the variants: rounded tile, full-bleed square (iOS, Windows), maskable (Android safe zone), bare mark, mono mark (Safari) |
| `src/icons.ts` | What is generated and what the site links: `headLinks`, `headMeta`, `manifestIcons`, brand colours |
| `scripts/generate-icons.ts` | Renders everything with sharp into `apps/web/public/` |

## Regenerate

From the repo root:

```sh
task brand:icons                       # or: pnpm brand:icons
task brand:icons -- --out tmp/icons    # preview a redesign elsewhere
```

The output is committed (the build does not run sharp). `pnpm --filter @beda/brand test`
fails when a linked icon is missing, has the wrong size, or is older than `tile.svg`.

## Change the icon

1. Replace `src/tile.svg` (keep the shape: square `viewBox="0 0 N N"`, full-size background `<rect>` first).
2. If the mark reaches further from the centre, adjust `MASKABLE_SCALE` in `src/tile.ts`.
3. If the colours change, update `BRAND_*` in `src/icons.ts` together with `packages/tokens`.
4. `task brand:icons`, check `apps/web/public/maskable-icon-512x512.png`, commit.

The site links the icons from `apps/web/src/layouts/Base.astro`; the manifest is
`apps/web/src/pages/manifest.webmanifest.ts`.
