# apps/web

Web-app notes that add to the root `CLAUDE.md`, which still applies in full.

## Structured data (JSON-LD)

JSON-LD is built **in code**, not in frontmatter. Each page component in `src/components/pages/*.astro` assembles its schema.org objects and renders them with `<JsonLd slot="head" data={…} />` (`src/components/JsonLd.astro`, which escapes `<`). The ru and en routes in `src/pages/**` are thin wrappers around the same component, so one change covers both locales.

- Shared shapes go in `src/lib/jsonld.ts` (today: `breadcrumbList(site, crumbs)`).
- URLs: always absolute, built as `new URL(getLocalizedPath(path, lang), Astro.site).href`. No hardcoded `https://beda.lol`, no placeholders, no trailing slash (`trailingSlash: 'never'`). The last breadcrumb is the page's canonical.
- Text comes from `t('…')` (`src/i18n/ui.ts`, add keys for both `ru` and `en`) or the content entry, and must match what the page shows. `inLanguage` is `htmlLang[lang]`.
- One `<JsonLd>` per page. Several nodes go in one `@graph` (see `PillarArticle.astro`).
- A locale that shows a stub (en pillar articles) gets only what is true for it (breadcrumbs), not `Article`.

Current coverage: `WebSite` on `/`; `Article` + `BreadcrumbList` on `/bukvy/<slug>` (en: breadcrumbs only); `BreadcrumbList` on `/bukvy`, `/osmotr`, `/kak-nazovesh`, `/pravila`, `/konfidencialnost`, `/cookies`. None on `/404`, `/dev/*`, `/osmotr/r/*`, `/voiti` or `/kabinet` (out of search).

**When you add or change a page, give it JSON-LD with the `generate-ldjson` skill** (`.claude/skills/generate-ldjson/`). `SKILL.md` has the workflow and `reference.md` covers which type to use for which page, field rules and a checklist. Then audit the build:

```bash
pnpm --filter web build
node .claude/skills/generate-ldjson/audit-ldjson.mjs               # all prerendered pages
node .claude/skills/generate-ldjson/audit-ldjson.mjs --dump bukvy  # filter by route, print blocks
```

The audit exits 1 on errors (bad JSON, relative or off-site URLs, `inLanguage` ≠ `<html lang>`, broken breadcrumbs, duplicate types). Fix its warnings or explain them in PROGRESS.md. It reads `dist/client`, so SSR routes (`prerender = false`) must be checked by `curl` against `task web:dev` instead.

Known gap: pillar articles have no `datePublished`, because the content schema has no date field. Adding one is a content-schema change, so do it only in a step that covers it.

## Cookies, consent and analytics

The same flow as the sibling GigLabo sites (lookbook, stereola, moat-atlas), in this app's idiom (Preact islands, the dictionary, tokens):

- `src/lib/consent.ts`: Consent Mode v2 (everything but `security_storage` denied by default), the categories as data (`CATEGORIES`: the Consent Mode fields each opens and the cookies it leaves), the stored choice (`beda-consent`), the region check.
- `src/lib/analytics.ts`: `trackEvent` / `trackPageView` (every event carries the locale and utm tags; never send what a visitor typed), and the `/analytics.js` body. GA4 runs with `send_page_view: false`; `consent/AnalyticsLoader.astro` sends the page view after the stored choice is applied.
- `src/pages/analytics.js.ts`: GA is configured at runtime by `BEDA_GA_ID` (web.env), so prerendered pages and a local stack from the release images never report to the real property. **Everything is gated on it, the banner too**: with no id nothing is stored that a visitor could refuse.
- `components/consent/`: `CookieBanner` (every page, `Base.astro`) and `CookieSettings` (`/cookies`, the only way back to the choice), sharing `Categories`.
- Region: `/api-shared/ip` on this origin, routed by Caddy to the shared service (`deploy/SERVER-SETUP.md` §4b). Only `{ ip: { isEu } }` reaches the page. Anything that is not an explicit boolean (FAIL, 404, timeout) shows the banner and is not cached; outside the EU consent is granted without asking (`how: 'auto'`).
- The CSP (`astro.config.mjs`) allows gtag's origins from `analytics.ts`.
- **When you add browser storage or a cookie**, add its row to `src/content/legal/{ru,en}/cookies.md` (a unit test checks the known keys are listed) and, if it needs consent, a category in `CATEGORIES`.

