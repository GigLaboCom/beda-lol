# S00 — Repository bootstrap

Stage 0 · Depends on: — · Small

## Goal
The empty `beda-giglabo` repo becomes a working pnpm + Nx + Cargo monorepo skeleton with Task commands, and the imported archive is moved into `archive/` and `docs/`.

## Read first
- `CLAUDE.md`
- Spec `docs/07-spec-beda-giglabo.md` → sections «Монорепо beda-giglabo», «Решения и допущения» (in `_import/yacht-beda/docs/` until you move it)
- `_import/yacht-beda/README.md`

## Tasks
1. Ask the human for the GitHub owner (user or org) if `CLAUDE.md` still says `OWNER`. Replace `OWNER` in `CLAUDE.md`.
2. Move the import:
   - `_import/yacht-beda/src/` → `archive/src/`
   - `_import/yacht-beda/site/` → `archive/site/`
   - `_import/yacht-beda/design/` → `archive/design/`
   - `_import/yacht-beda/docs/*.md` → `docs/` (keep file names; includes `08-amendments.md`)
   - `_import/yacht-beda/tactics/` → `docs/tactics/`
   - `_import/yacht-beda/README.md` → `archive/README.md`
   - Delete `_import/` (the `claude-code/` kit is already in place from BOOTSTRAP).
3. Root files:
   - `.editorconfig` (utf-8, lf, 2 spaces; 4 spaces for Rust; tabs for Makefiles).
   - `.gitignore`: node_modules, dist, .astro, .nx, coverage, `*.env`, `.env*` except `*.env.example`, Rust `target/`, `tmp/`, OS junk. (Do **not** ignore `.sqlx/` or `Cargo.lock` — both are committed.)
   - `.node-version` with the current Node LTS major.
   - `LICENSE`: MIT, copyright holder from the human (ask; default "Denis").
   - `README.md` (English, short): what the site is, link to https://beda.lol, how to run `task dev`, where the spec and steps are, and a "Brand" note: code is MIT; texts, design and the «Яхта Беда» brand are not covered by the MIT license.
   - `package.json`: private, `packageManager` set to the current pnpm, scripts delegating to Nx (`build`, `test`, `lint`, `typecheck`).
   - `pnpm-workspace.yaml`: `apps/*`, `packages/*`.
   - `nx.json`: target defaults `build` (outputs `dist/**`), `test`, `lint`, `typecheck`, with sensible `dependsOn` and caching. (Replaces `turbo.json` from the spec: the frontend is orchestrated by Nx.)
   - `biome.json`: formatter + linter for TS/JS/JSON/CSS; ignore `archive/`, generated code, `dist/`.
4. `Taskfile.yml` with tasks (bodies may be stubs that print "added in SNN" until their step):
   `dev`, `check`, `test`, `lint`, `gen`, `migrate:new`, `db:reset`, `web:dev`, `api:dev`. `check` must already run `biome check` and `pnpm -r typecheck` (no-op for now).
5. Empty dirs with `.gitkeep`: `apps/`, `packages/`, `deploy/`, `docs/adr/`. (`supabase/` is created by the CLI in S02; the Cargo workspace in S01.)
6. `docs/adr/0001-stack.md`: 10–20 lines recording the stack decision (Astro + Rust API + Supabase for Postgres and Auth, one VPS for web and api) per amendments П-1 and П-2, and the open question about the data region. Link the spec and `docs/08-amendments.md`.

## Out of scope
No Astro or Rust code yet. No workflows. No Docker.

## Verify
- `pnpm install` succeeds.
- `task --list` shows the tasks.
- `task check` passes.
- `git status` clean after commit; `_import/` gone; `archive/site/yacht-beda-site.html` opens in a browser.

## Done when
- [ ] Archive moved, `_import/` deleted
- [ ] Root config files present
- [ ] `task check` green
- [ ] ADR 0001 written
- [ ] PROGRESS.md updated
