# GitHub repository settings (for the human)

Click through these once in **Settings** of `GigLaboCom/beda-lol`. Tick each box when done.

## General

- [ ] Pull requests: allow **squash merging** only; default message "Pull request title and description"
- [ ] Automatically delete head branches
- [ ] Always suggest updating pull request branches

## Branch protection — `main` (Settings → Rules → Rulesets, or Branches)

- [ ] Require a pull request before merging (1 approval is optional for a solo repo)
- [ ] Require status checks to pass: `ci / web`, `ci / api`, `CodeQL (javascript-typescript)`, `CodeQL (rust)`, `CodeQL (actions)`
- [ ] Require branches to be up to date before merging
- [ ] Block force pushes and deletions
- [ ] Require linear history

## Actions (Settings → Actions → General)

- [ ] Workflow permissions: **Read repository contents and packages permissions**
- [ ] Do not allow GitHub Actions to create and approve pull requests
- [ ] Fork pull request workflows: **Require approval for first-time contributors**
- [ ] Allow actions: all actions pinned by SHA are fine; optionally restrict to "GitHub + verified creators + listed" (`actions-rust-lang/*`, `Swatinem/*`, `taiki-e/*`, `supabase/*`)

## Code security (Settings → Code security)

- [ ] Dependency graph on
- [ ] Dependabot alerts and security updates on (version updates come from `.github/dependabot.yml`)
- [ ] Secret scanning on
- [ ] Push protection on
- [ ] Private vulnerability reporting on (referenced by `SECURITY.md`)
- [ ] CodeQL: "Advanced" setup (the workflow in `.github/workflows/codeql.yml`), not "Default"

## Environments (from S06)

- [ ] Environment `production`, deployment branches: `main` only
- [ ] Secrets: `DEPLOY_SSH_KEY`, `SSH_KNOWN_HOSTS`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
- [ ] Variables: `DEPLOY_HOST`, `SUPABASE_PROJECT_REF`
