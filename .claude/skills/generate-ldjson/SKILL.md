---
name: generate-ldjson
description: Generate, update or audit JSON-LD (schema.org structured data) for beda.lol pages. Use when the user asks to generate LD-JSON / JSON-LD, add structured data or SEO schemas to a page, check rich results, or when a new page or route is added and needs its schema.
---

# generate-ldjson

Ported from the `generate-ldjson` skill in cloud-agents, adapted to how this site works. There, JSON-LD comes from MDX frontmatter with `<APP_URL>` placeholders. Here it is **built in code**: each page component assembles schema.org objects in its frontmatter and renders them with `JsonLd.astro`. There is no `ldJson` frontmatter and no placeholders.

The decision tree, field rules and examples are in [`reference.md`](reference.md). Read it before writing a schema.

## How JSON-LD works in this repo

| Piece | Where |
| --- | --- |
| Renderer (escapes `<`, emits `<script type="application/ld+json">`) | `apps/web/src/components/JsonLd.astro` |
| Helpers (`breadcrumbList(site, crumbs)`, add new ones here) | `apps/web/src/lib/jsonld.ts` |
| Page components that emit it (one per page, shared by ru and en routes) | `apps/web/src/components/pages/*.astro` |
| Route files (thin wrappers: `pages/x.astro` and `pages/en/x.astro`) | `apps/web/src/pages/**` |
| Copy for `name` / `headline` / `description` | `apps/web/src/i18n/ui.ts` through `useTranslations(lang)` |
| Locale → `inLanguage` (`htmlLang`), URL prefixing (`getLocalizedPath`) | `apps/web/src/i18n/{config,index}.ts` |
| Pillar article data (`title`, `description`, `slug`, `draft`) | `apps/web/src/content/pillars/*.md`, schema in `src/content.config.ts` |
| OG images used as `image` | `/og/bukvy/<slug>.png`, `/og/osmotr/<code>.png` (S13) |
| Site origin | `Astro.site` (from `BEDA_BASE_URL`, default `https://beda.lol`) |

Current coverage (S12/S14): `WebSite` on `/`; `Article` + `BreadcrumbList` in one `@graph` on `/bukvy/<slug>` (en has only `BreadcrumbList`, because the article is an untranslated stub); `BreadcrumbList` on `/bukvy`, `/osmotr`, `/kak-nazovesh`, `/pravila`, `/konfidencialnost`, `/cookies`. Planned: `CreativeWork` for epitaphs (S27, `ROADMAP.md`).

## Workflow

### 1. Pick the target

Ask for the route if the user did not name one. For "audit everything", skip to step 6 and then fix what it reports. Map the route to its page component: `pages/osmotr/index.astro` → `components/pages/OsmotrIntro.astro`, and so on. Check both locales: ru is unprefixed, en is under `/en/`, and both render the same component.

### 2. Look at the rendered page (mandatory)

The components hold almost no text. The copy comes from `ui.ts`, the content collection and the islands, so the rendered HTML is the source of truth for what users see.

- Static pages: `pnpm --filter web build`, then read `apps/web/dist/client/<route>/index.html`. `en` pages are under `dist/client/en/`.
- SSR routes (`prerender = false`, e.g. `/osmotr/r/[code]`) and live checks: `task web:dev` (port 4321) and `curl -s http://localhost:4321/<route>`. For a full stack use `task local:up` (port 8088).

Extract: the `<h1>` and headings, the lead and visible body, the breadcrumbs nav, `<html lang>`, the canonical, `robots`, `og:image`, any Q&A, steps or dates, and any existing `application/ld+json`. Do this for **both** locales.

### 3. Read the source

Read the page component, the route files, and whatever feeds it: the `ui.ts` keys it uses and the pillar frontmatter. Note what data is available at build time, because a field you cannot fill truthfully does not go in.

### 4. Build a short content summary

Before writing code, write out the locale(s), the canonical URL(s), the indexability (`noindex`?), the visible content that maps to schema fields, and the chosen types with a one-line rationale. Use the template in `reference.md`. Show it to the user when the choice is not obvious.

### 5. Implement in code

- Build the object in the page component's frontmatter and render it with `<JsonLd slot="head" data={…} />`. Several nodes on one page go in one `{ '@context': 'https://schema.org', '@graph': [...] }`, as in `PillarArticle.astro`.
- If a shape repeats on two or more pages, add a typed helper to `lib/jsonld.ts` next to `breadcrumbList`, and give it a Vitest test if it has logic.
- **URLs:** always absolute, built with `new URL(getLocalizedPath(path, lang), Astro.site).href`. Never hardcode `https://beda.lol`, and never use placeholders. No trailing slash (`trailingSlash: 'never'`). The last breadcrumb equals the page's canonical.
- **Text:** take it from `t('…')` or the content entry. If you need new copy, add the key to `ui.ts` for **both** `ru` and `en`. Never inline Russian or English strings in the component. Values must match what the page shows; JSON-LD that says things the page does not is spam to Google.
- **Language:** `inLanguage: htmlLang[lang]`, never a literal.
- **Locale gaps:** if a locale shows a stub (en pillars today), emit only what is true for it (breadcrumbs) and not the content type.
- **Brand rules apply** (CLAUDE.md): no cartoon names, quotes or imagery in any field.

### 6. Verify

```bash
pnpm --filter web build
node .claude/skills/generate-ldjson/audit-ldjson.mjs            # all pages
node .claude/skills/generate-ldjson/audit-ldjson.mjs --dump bukvy   # one area, print the blocks
```

The audit checks the built HTML: the JSON parses; `@context`; every node has `@type`; URLs are absolute, on-site and without a trailing slash; `inLanguage` matches `<html lang>`; breadcrumb positions are contiguous and the last one equals the canonical; Article has headline ≤ 110, image, author and datePublished; no duplicate `WebSite`/`Article`/`BreadcrumbList`; indexable pages have some JSON-LD. It exits 1 on errors. Warnings are judgement calls: fix them or say why not.

For SSR routes the audit cannot see, `curl` the dev server and check the block by hand against the same list.

Then run `task check`, which must pass. After deploy, the user can paste the production URL into Google's Rich Results Test and the Schema.org validator (validator.schema.org). Offer that; it can't be done from here for a local build.

### 7. Report

List which pages changed and which types they got, the audit summary line, and anything left out on purpose (e.g. "no `datePublished`: the frontmatter has no date"). If this is part of a step, note it in that step's PROGRESS.md entry. Adding a new frontmatter field (e.g. a date on pillars) changes the content schema; check it is in scope first.
