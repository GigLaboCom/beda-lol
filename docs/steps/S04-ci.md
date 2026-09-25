# S04 — CI and repository hygiene

Stage 0 · Depends on: S01, S02, S03 · Medium

## Goal
Every PR and push runs the same checks as `task check` on GitHub Actions, with no secrets and pinned actions; the repo has Dependabot, CodeQL, CODEOWNERS and templates.

## Read first
- Spec «CI/CD на GitHub Actions», «Безопасность публичного репозитория»; `docs/08-amendments.md` (CI row)
- `CLAUDE.md` → Hard rules

## Tasks
1. `.github/workflows/ci.yml`, triggers `pull_request` and `push` to `main`. Top-level `permissions: contents: read`. `concurrency` per ref with cancel-in-progress for PRs.
   - job `web`: checkout, pnpm via corepack, Node from `.node-version` with pnpm cache, `pnpm install --frozen-lockfile`, `biome ci`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm --filter web build`.
   - job `api`: Rust toolchain from `rust-toolchain.toml` (a pinned toolchain action), `Swatinem/rust-cache` (pinned), `sqlx-cli` and `cargo-deny` installed as prebuilt binaries (e.g. via a pinned `taiki-e/install-action`), Supabase CLI (official setup action, pinned) and `supabase start` excluding services the tests don't need (keep Postgres; exclude Studio, Realtime, Storage, etc. — check the CLI's exclude flag), `supabase db reset` to prove migrations apply from zero, then `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` with `BEDA_TEST_DATABASE_URL` pointing at the local stack, `cargo sqlx prepare --workspace --check`, `SQLX_OFFLINE=true cargo build --release -p beda-api`, `cargo deny check`.
   - Every third-party action pinned to a full commit SHA with the version in a comment. Resolve SHAs with `git ls-remote https://github.com/<org>/<action> refs/tags/<tag>` (dereference annotated tags with `^{}`).
2. `.github/workflows/codeql.yml`: JavaScript/TypeScript, plus Rust if CodeQL supports it in its current release (check the docs; if not, `cargo deny` covers advisories), on PR, push to `main`, weekly schedule. `permissions: security-events: write` only in that job.
3. `.github/dependabot.yml`: weekly for `npm` (root), `cargo` (root workspace), `github-actions`, `docker` (`/apps/web`, `/apps/api` once Dockerfiles exist — add now, harmless before). Group minor/patch updates.
4. `.github/CODEOWNERS`: `/deploy/`, `/.github/`, `/supabase/migrations/` → `@OWNER`.
5. `.github/pull_request_template.md` (what, why, how verified, step id) and issue templates `bug.md`, `idea.md` (short).
6. `SECURITY.md`: how to report a vulnerability privately (GitHub private advisories), what is in scope.
7. `docs/repo-settings.md`: the exact GitHub settings to click through (from the spec table), each as a checkbox — this is for the human.

## Out of scope
No build or deploy of images (S05, S06).

## Verify
- `act` is optional; the real check is pushing the branch: CI green on the PR.
- No workflow uses `pull_request_target`; `grep -r "uses:" .github | grep -v "@[0-9a-f]\{40\}"` returns nothing (except local actions).

## Done when
- [ ] ci.yml green on the PR
- [ ] CodeQL runs
- [ ] Dependabot, CODEOWNERS, templates, SECURITY.md present
- [ ] `docs/repo-settings.md` written
- [ ] PROGRESS.md updated

## [HUMAN]
- Apply the settings from `docs/repo-settings.md`: branch protection for `main` with required checks `ci / web`, `ci / api`, `CodeQL`; secret scanning + push protection; "Require approval for first-time contributors"; Actions permissions "Read repository contents".
