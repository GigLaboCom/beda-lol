# S06 — Server, deploy workflow, backups

Stage 0 · Depends on: S05 · Medium, with [HUMAN] parts

## Goal
A merge to `main` builds and pushes both images to GHCR and deploys them to the VPS with migrations, health checks and automatic rollback; the database is backed up nightly and a restore has been tested. `https://beda.lol` shows the placeholder.

## Read first
- Spec «CI/CD на GitHub Actions» (deploy steps, forced-command key), «Инфраструктура и хостинг», «Наблюдаемость, аналитика, бэкапы»
- `docs/08-amendments.md` (deploy, backups, keys, plan, region)

## Tasks
1. `deploy/SERVER-SETUP.md` — runbook for the human, every step copy-pasteable:
   - OS updates, unattended security upgrades, firewall (22, 80, 443), SSH key-only login.
   - Docker Engine + compose plugin.
   - user `deploy` in group `docker`, `/opt/beda/` owned by it, `deploy/` files placed there (clone read-only or copy).
   - `/opt/beda/.env` created by hand from `deploy/.env.example`, mode 600. **Deviation from spec:** the spec says the workflow writes `.env`; with a forced-command deploy key that is not possible, so `.env` is maintained by hand. Record this in PROGRESS.
   - deploy key in `~deploy/.ssh/authorized_keys` as `restrict,command="/opt/beda/deploy/scripts/deploy.sh" ssh-ed25519 …`.
   - DNS: `A`/`AAAA` for `beda.lol`, `CAA 0 issue "letsencrypt.org"`.
   - GHCR images are public, so the server pulls without login (document how to make the packages public).
2. `deploy/scripts/deploy.sh`:
   - `set -euo pipefail`; SHA from `SSH_ORIGINAL_COMMAND` or `$1`; must match `^[0-9a-f]{40}$`, else exit 2.
   - `flock` on `/opt/beda/.deploy.lock`.
   - `export BEDA_TAG=$SHA`; `docker compose pull api web`; `docker compose up -d api web`. (Migrations are applied by the workflow with the Supabase CLI **before** this script runs — see task 5.)
   - poll `https://beda.lol/api/readyz` and `/` for up to 60 s.
   - success → write SHA to `/opt/beda/.last_good`; failure → `BEDA_TAG=$(cat .last_good) docker compose up -d api web`, exit 1.
   - log each step with timestamps to stdout (shows in the Actions log).
3. `deploy/scripts/backup.sh` and a `backup` image (`deploy/backup/Dockerfile`: Postgres client matching the Supabase Postgres major + `age` + an S3 client such as `rclone` or `aws-cli`): nightly `pg_dump -Fc` of the Supabase database (schemas `app` and `auth`, via a connection string with read access), encrypt to an `age` public key, upload, prune to 14 daily / 8 weekly / 6 monthly. This is an independent copy on top of Supabase's own backups. Schedule inside the container (e.g. `supercronic`). Remove `profiles` from the service.
4. `deploy/scripts/restore.sh`: download a given (or latest) dump, decrypt with the private key supplied at runtime, restore into a throwaway Postgres container, run sanity queries (table counts, latest `created_at`), print a report.
5. `.github/workflows/deploy.yml`: `on: workflow_run` of `ci` completed on `main` with `conclusion == success` (or `push` to `main` with a `needs` on a reusable CI — pick one and explain in PROGRESS). `permissions: contents: read, packages: write`. `concurrency: production` (no cancel). `environment: production`.
   - build and push `ghcr.io/giglabocom/beda-api` and `beda-web` with tags `${{ github.sha }}` and `main`, using buildx with GHA cache (cache mode max, so the `cargo-chef` dependency layer is reused). Pass `BEDA_BUILD_SHA=${{ github.sha }}`.
   - migrate: Supabase CLI (pinned setup action), `supabase link --project-ref ${{ vars.SUPABASE_PROJECT_REF }}`, `supabase db push` using secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. Fail the job before deploy if it fails. Migrations must stay backward compatible with the running version (expand/contract), because rollback does not undo them.
   - deploy: write `SSH_KNOWN_HOSTS` and `DEPLOY_SSH_KEY` secrets to files, `ssh deploy@${{ vars.DEPLOY_HOST }} "${{ github.sha }}"`.
6. `shellcheck` for `deploy/scripts/*.sh` added to `ci.yml` and `task check`.

## Out of scope
No uptime monitor (stage 2), no analytics.

## Verify
- `shellcheck` clean.
- `deploy.sh` rejects a bad SHA (exit 2) — test locally.
- After [HUMAN] setup: merge a trivial change → Actions shows build, push, deploy; site shows it.
- Break it on purpose (a branch where `readyz` returns 503, deployed via `workflow_dispatch`) → rollback to last good happens. Then revert.
- Run `restore.sh` against the first nightly backup; paste the report into PROGRESS.

## Done when
- [ ] SERVER-SETUP.md complete
- [ ] deploy.sh with rollback, tested
- [ ] backup and restore scripts, first restore verified
- [ ] deploy.yml deploys on merge
- [ ] https://beda.lol live with valid TLS
- [ ] PROGRESS.md updated

## [HUMAN]
- Rent the VPS (region per the open question about personal data), follow `deploy/SERVER-SETUP.md`.
- DNS records for `beda.lol`.
- GitHub environment `production`: secrets `DEPLOY_SSH_KEY`, `SSH_KNOWN_HOSTS`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`; variables `DEPLOY_HOST`, `SUPABASE_PROJECT_REF`; restrict to branch `main`.
- Create the Supabase project on a paid plan (free projects pause when idle); region per the personal-data question (amendment П-1, rule 8). Set a password for the `beda_api` role; put the connection string (session pooler, or direct if the VPS has IPv6) into `/opt/beda/.env`.
- Object storage bucket + credentials for backups (in `/opt/beda/.env`), `age` key pair (keep the private key offline).
- Make the two GHCR packages public after the first push.
