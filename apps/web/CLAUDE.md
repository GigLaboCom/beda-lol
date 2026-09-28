# apps/web

Web-app notes that add to the root `CLAUDE.md`, which still applies in full.

## Structured data (JSON-LD)

JSON-LD is built **in code**, not in frontmatter. Each page component in `src/components/pages/*.astro` assembles its schema.org objects and renders them with `<JsonLd slot="head" data={…} />` (`src/components/JsonLd.astro`, which escapes `<`). The ru and en routes in `src/pages/**` are thin wrappers around the same component, so one change covers both locales.

- Shared shapes go in `src/lib/jsonld.ts` (today: `breadcrumbList(site, crumbs)`).
- URLs: always absolute, built as `new URL(getLocalizedPath(path, lang), Astro.site).href`. No hardcoded `https://beda.lol`, no placeholders, no trailing slash (`trailingSlash: 'never'`). The last breadcrumb is the page's canonical.
- Text comes from `t('…')` (`src/i18n/ui.ts`, add keys for both `ru` and `en`) or the content entry, and must match what the page shows. `inLanguage` is `htmlLang[lang]`.
- One `<JsonLd>` per page. Several nodes go in one `@graph` (see `PillarArticle.astro`).
- A locale that shows a stub (en pillar articles) gets only what is true for it (breadcrumbs), not `Article`.

Current coverage: `WebSite` on `/`; `Article` + `BreadcrumbList` on `/bukvy/<slug>` (en: breadcrumbs only); `BreadcrumbList` on `/bukvy`, `/osmotr`, `/kak-nazovesh`. None on `/404`, `/dev/*` or `/osmotr/r/*` (out of search).

**When you add or change a page, give it JSON-LD with the `generate-ldjson` skill** (`.claude/skills/generate-ldjson/`). `SKILL.md` has the workflow and `reference.md` covers which type to use for which page, field rules and a checklist. Then audit the build:

```bash
pnpm --filter web build
node .claude/skills/generate-ldjson/audit-ldjson.mjs               # all prerendered pages
node .claude/skills/generate-ldjson/audit-ldjson.mjs --dump bukvy  # filter by route, print blocks
```

The audit exits 1 on errors (bad JSON, relative or off-site URLs, `inLanguage` ≠ `<html lang>`, broken breadcrumbs, duplicate types). Fix its warnings or explain them in PROGRESS.md. It reads `dist/client`, so SSR routes (`prerender = false`) must be checked by `curl` against `task web:dev` instead.

Known gap: pillar articles have no `datePublished`, because the content schema has no date field. Adding one is a content-schema change, so do it only in a step that covers it.
