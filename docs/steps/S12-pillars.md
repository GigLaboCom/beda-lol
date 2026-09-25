# S12 — Six pillar articles

Stage 1 · Depends on: S09 · Medium (mostly writing)

## Goal
Six indexable articles `/bukvy/<slug>` — one per letter of ПОБЕДА — explain the pillar, give the quiz questions for it, and list concrete first actions; they are the site's main search landing pages.

## Read first
- `docs/tactics/00-concept.md` (acrostic, tone rules)
- `@beda/core` `PILLARS`, `QUESTIONS`, `ACTS`, `STEPS`
- Spec «SEO и индексация»

## Tasks
1. Astro content collection `pillars` in `apps/web/src/content/pillars/*.md` with frontmatter: `letter`, `slug`, `title`, `description`, `order`, `draft: true`.
   Slugs: `p-pozicionirovanie`, `o-obshchenie-s-lyudmi`, `b-besplatnaya-cennost`, `e-edinaya-tochka-vhoda`, `d-distribuciya`, `a-analitika`.
2. Draft each article in Russian, 500–900 words, in the rubric's tone (self-irony, no preaching, concrete): what the pillar is, how it falls off in real pet projects, the two quiz questions, 3–4 first actions (reuse `STEPS`/`ACTS` wording), a closing line linking to `/osmotr`. No invented statistics, studies or quotes; no cartoon references. Mark every article `draft: true`.
3. Page template `/bukvy/[slug].astro` (prerendered): transom with only this letter highlighted, article body, prev/next letter navigation, breadcrumbs, CTA to the quiz. JSON-LD `Article` + `BreadcrumbList`.
4. Index `/bukvy` listing the six with short descriptions.
5. Link the home pillars and harbour cards to these pages.
6. Build rule: `draft: true` pages are built but get `noindex` and are excluded from the sitemap until the human flips the flag.

## Out of scope
No comments, no UGC on these pages.

## Verify
- All six pages render, pass `astro check`, have unique titles/descriptions.
- `draft` pages carry `noindex`.
- `task check` green.

## Done when
- [ ] Collection, template, index
- [ ] Six drafts written
- [ ] Home links updated
- [ ] PROGRESS.md updated

## [HUMAN]
- Read and edit the six drafts in your voice; set `draft: false` when happy.
