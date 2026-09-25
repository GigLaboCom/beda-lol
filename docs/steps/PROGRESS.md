# Progress

Tick a step only when its "Done when" list is fully met and `task check` passes.

## Stage 0 — Foundation
- [x] S00 Repository bootstrap
- [ ] S01 Rust API skeleton
- [ ] S02 Supabase: local stack, migrations, sqlx
- [ ] S03 Astro web skeleton and tokens
- [ ] S04 CI and repository hygiene
- [ ] S05 Container images and prod compose
- [ ] S06 Server, deploy workflow, backups

## Stage 1 — Static site and quiz
- [ ] S07 packages/core
- [ ] S08 packages/transom
- [ ] S09 Home page
- [ ] S10 Ship inspection quiz and result page
- [ ] S11 Name game page
- [ ] S12 Six pillar articles
- [ ] S13 Share images
- [ ] S14 SEO baseline and stage 1 launch

## Stages 2–6
See `ROADMAP.md`. Expand each into a step file before starting it.

---

## Handover log

(append entries below, newest last)

### S00 — Repository bootstrap — 2026-09-25
- Done: archive moved to `archive/` and `docs/` (plus `docs/tactics/`, `docs/BOOTSTRAP.md`), Claude Code kit in place; root config (`.editorconfig`, `.gitignore`, `.node-version`, MIT `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `nx.json`, `biome.json`), `Taskfile.yml` with stub tasks, `.gitkeep` dirs, ADR 0001.
- Deviations from step/spec: **Nx instead of Turborepo** (`nx.json` instead of `turbo.json`; the human asked for Nx on the frontend) — step files S00, S05, S13 and `CLAUDE.md` updated. **Domain `beda.lol`** instead of `beda.giglabo.com` (the repo is `GigLaboCom/beda-lol` and its README names beda.lol); spec docs keep the old name, step files and `CLAUDE.md` use the new one. OWNER = `GigLaboCom`. `_import/` was never created: the archive was unpacked straight into place.
- New deps: `nx` 23 (task orchestration, replaces turbo), `@biomejs/biome` 2.5 (lint/format, named in the step). pnpm pinned to 10.33.0 via `packageManager`.
- Follow-ups: none.
- [HUMAN] open: none.
