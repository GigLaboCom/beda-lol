# S14 — SEO baseline and stage 1 launch

Stage 1 · Depends on: S10, S11, S12, S13, S06 · Medium, with [HUMAN] parts

## Goal
The stage 1 site is live on `beda.giglabo.com` with correct robots, sitemap, canonical URLs, structured data and performance, registered in Google Search Console and Yandex Webmaster.

## Read first
- Spec «SEO и индексация» (table), «Этапы работ» (stage 1 done-when)

## Tasks
1. `@astrojs/sitemap` for prerendered pages; exclude `/dev/*`, result pages, drafts. Expose `/sitemap-index.xml`. (The UGC sitemap is added in stage 3.)
2. `public/robots.txt`: disallow `/api/`, `/admin/`, `/kabinet`, `/moya-yahta`, `/dev/`; `Sitemap: https://beda.giglabo.com/sitemap-index.xml`.
3. Canonical on every page from the layout; trailing-slash policy chosen and enforced (Astro `trailingSlash` + Caddy redirect if needed).
4. JSON-LD: `WebSite` on home, `Article` + `BreadcrumbList` on pillars (from S12), `BreadcrumbList` elsewhere.
5. 404 page in the site's style with links to home and the quiz.
6. Performance: check LCP element is the CSS transom or headline, fonts preloaded for the display face only, images sized. Add `weekly.yml` with Lighthouse CI against production for `/`, `/osmotr`, one pillar page; budget: performance ≥ 90 mobile, accessibility ≥ 95. Pinned actions.
7. Content Security Policy via Astro's CSP support for the installed version (hashes for inline scripts); verify the hero script and islands still run.
8. IndexNow key file placeholder route (key comes from env) — ready for stage 3.
9. Update `README.md` status and `docs/steps/ROADMAP.md` with anything learned.

## Out of scope
Accounts, UGC, analytics dashboards.

## Verify
- `curl -I https://beda.giglabo.com/` → 200, HSTS, CSP present; `/robots.txt`, `/sitemap-index.xml` valid.
- Lighthouse on production meets the budget (paste scores).
- Rich Results Test on a pillar page shows valid Article + Breadcrumb.

## Done when
- [ ] robots, sitemap, canonical, JSON-LD, 404
- [ ] CSP on, nothing broken
- [ ] weekly Lighthouse workflow
- [ ] Stage 1 live
- [ ] PROGRESS.md updated

## [HUMAN]
- Add the site to Google Search Console and Yandex Webmaster (DNS TXT verification), submit the sitemap.
- Flip `draft: false` on the pillar articles you have approved (S12).
- Announce stage 1 in the rubric.
