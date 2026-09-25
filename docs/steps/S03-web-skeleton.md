# S03 — Astro web skeleton and tokens

Stage 0 · Depends on: S00 · Medium

## Goal
`apps/web` is an Astro site with the Node adapter and Preact, a base layout using the design tokens and self-hosted fonts, a placeholder home page, and a dev proxy from `/api` to Go.

## Read first
- Spec «Фронт на Astro»
- `docs/05-site.md` §7 (tokens), §8 (responsive)
- `archive/site/yacht-beda-site.html` (the `:root` tokens and base styles)
- Astro docs for the installed version: adapters, on-demand rendering, islands, i18n

## Tasks
1. `packages/tokens`: `tokens.css` with all custom properties from the site prototype (`--tar`, `--hull`, `--plank`… `--sea-muted`, font stacks), the dark-scheme override exactly as in the prototype, and a `:root[data-theme]` override. Export the CSS file from the package.
2. Fonts self-hosted via Fontsource packages: Playfair Display 700/900, IBM Plex Sans 400/500/600, IBM Plex Mono 400/500 — Cyrillic and Latin only. Import in the base layout, `font-display: swap`.
3. `apps/web`: Astro, `@astrojs/node` in standalone mode, `@astrojs/preact`, TypeScript strict. Server output file must be runnable as `node ./dist/server/entry.mjs`.
4. `src/layouts/Base.astro`: `<html lang="ru">`, viewport with `viewport-fit=cover`, safe-area paddings as in the prototype, meta description slot, canonical slot (absolute URL from `BEDA_BASE_URL`), `robots` slot, skip link, sticky header and footer from the prototype (links can point to future routes).
5. `src/i18n/ru.ts`: dictionary object; the layout reads header/footer strings from it. A tiny `t()` helper with typed keys.
6. `src/pages/index.astro`: placeholder hero with the headline «ПО у тебя есть. Победы нет.» and a static CSS transom (copy markup and CSS from the prototype for now; S08 replaces it with the package).
7. Dev proxy: Vite `server.proxy` for `/api` → `http://localhost:8080` (the Rust API), so dev is same-origin like prod.
8. Tooling: `astro check` as `typecheck`; Vitest configured at the workspace level for `packages/*` (no tests yet besides a trivial one in tokens to prove the setup).
9. Taskfile: `web:dev`; `dev` now also runs web; `check` runs `astro check` and `astro build`.

## Out of scope
No real content beyond the placeholder; no islands; no transom package.

## Verify
- `task dev` → http://localhost:4321 shows the placeholder with correct fonts and colours at 375 px and at 1280 px.
- `curl localhost:4321/api/healthz` returns the API response through the proxy.
- `pnpm --filter web build && node apps/web/dist/server/entry.mjs` serves the page.
- `task check` green.

## Done when
- [ ] tokens package and fonts
- [ ] Base layout with header/footer, dictionary
- [ ] Dev proxy works
- [ ] Production build runs with Node
- [ ] PROGRESS.md updated
