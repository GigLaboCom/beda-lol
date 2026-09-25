# Local development

Three ways to run beda.lol on your machine. Pick by what you are changing.

| You change | Run | Open |
| --- | --- | --- |
| **Frontend only** (`apps/web`, `packages/*`) | `task local:backend` + `task web:dev` | http://localhost:4321 |
| Frontend against **another backend** (staging, production) | `BEDA_API_URL=https://beda.lol task web:dev` | http://localhost:4321 |
| **API** (`apps/api`) | `task local:db` + `task api:dev` | http://localhost:8080/api/healthz |
| Migrations, auth, anything Supabase | `task dev` (Supabase CLI stack, the reference) | :4321, :8080, Studio :54323 |
| Nothing, just look at the site | `task local:up` | http://localhost:8088 |

Requirements: Docker with Compose v2.20+, [Task](https://taskfile.dev). For the host
frontend also Node 22.12+ and pnpm (`corepack enable && pnpm install`); for the host
API Rust (`rust-toolchain.toml`) and `watchexec`.

## The local stack (`deploy/local/compose.yaml`)

It runs the **same images CI publishes to GHCR** — no build needed.

```
                       ┌──────────── profile "full" ────────────┐
browser ─▶ :8088 proxy ─┤ /api/* ─▶ api :8080 ─▶ db :54330 (Postgres 17)
                        │ other  ─▶ web :4321 (Astro SSR image)
                        └────────────────────────────────────────┘
host `astro dev` :4321 ── /api ─▶ :8080 (published by the api container)
```

| Service | Image | Host port | Profile |
| --- | --- | --- | --- |
| `db` | `postgres:17-alpine` + roles and `supabase/migrations/*` applied on first start | 54330 | default |
| `api` | `ghcr.io/giglabocom/beda-api:${BEDA_TAG:-main}` | 8080 | default |
| `web` | `ghcr.io/giglabocom/beda-web:${BEDA_TAG:-main}` | — (behind the proxy) | `full` |
| `proxy` | `caddy:2.11.4-alpine`, same routing as production, plain HTTP | 8088 | `full` |

Tasks:

| Task | Does |
| --- | --- |
| `task local:pull` | pull the api and web images for `BEDA_TAG` |
| `task local:backend` | db + api (frontend runs on the host) |
| `task local:up` | db + api + web + proxy — the whole site |
| `task local:db` | only the database, prints the URL for a host-run API |
| `task local:api` | only the api container, against `BEDA_LOCAL_DATABASE_URL` |
| `task local:build` | build api and web images from this checkout, tagged `local` |
| `task local:logs` | follow logs (`task local:logs -- api`) |
| `task local:down` | stop, keep the database |
| `task local:reset` | stop and drop the database (migrations re-apply on next start) |

### Which images

- `BEDA_TAG=main` (default) — the latest green `main`.
- `BEDA_TAG=<full commit sha>` — exactly what is (or was) deployed.
- `BEDA_TAG=local` — built from your checkout: `task local:build`, then
  `BEDA_TAG=local task local:up`. Compose builds only when you ask
  (`task local:up -- --build` also works); otherwise it pulls.

```sh
BEDA_TAG=3f1c…e9 task local:pull
BEDA_TAG=3f1c…e9 task local:up
```

**GHCR access.** Until the packages are made public (S06 [HUMAN]), pulling needs a
login: create a GitHub token with `read:packages` and run
`echo $TOKEN | docker login ghcr.io -u <github-user> --password-stdin`.
The images appear after the first green `images` run on `main`; before that use
`task local:build`.

**Apple silicon.** Images are published for `linux/amd64`; Docker runs them under
emulation (fine for the API and the site). Local builds follow
`BEDA_LOCAL_PLATFORM` (default `linux/amd64`); set `BEDA_LOCAL_PLATFORM=linux/arm64`
with `task local:build` for native images.

## Frontend on the host, backend in Docker

```sh
task local:backend        # db + api from GHCR, API on :8080
task web:dev              # astro dev on :4321, /api proxied to :8080
```

`astro dev` proxies `/api` to `BEDA_API_URL` (default `http://localhost:8080`), so the
browser talks to one origin exactly as in production. Point it anywhere:

```sh
BEDA_API_URL=http://localhost:8080 task web:dev   # local stack or task api:dev (default)
BEDA_API_URL=https://beda.lol task web:dev        # production API
```

Careful with a remote backend: the quiz and the name game **write statistics** to it
(`POST /api/quiz/attempts`, `/api/events`). Point at production only to look, and
expect your test runs in its tables.

## API on the host, database in Docker

```sh
task local:db
BEDA_DATABASE_URL=postgresql://beda_api:beda_api_dev@127.0.0.1:54330/postgres task api:dev
```

To run the API **container** against the Supabase CLI database instead (e.g. to try a
published image against your migrations in progress):

```sh
supabase start && task db:dev-role
BEDA_LOCAL_DATABASE_URL=postgresql://beda_api:beda_api_dev@host.docker.internal:54322/postgres task local:api
```

## How the local database differs from Supabase

The compose `db` is plain Postgres 17 with just what our migrations need from
Supabase: the `anon`, `authenticated`, `service_role`, `authenticator` roles and an
`auth` schema (`deploy/local/initdb/00-supabase-roles.sql`). There is no Supabase
Auth, Data API or Studio. Migrations are applied once, when the volume is created —
after pulling new migrations run `task local:reset`.

`task dev` (Supabase CLI) stays the reference: CI, `task check` and the DB tests use
it, and anything touching auth or the Data API must be checked there.

## Where the images come from

```
push to main ─▶ ci (lint, types, tests, builds) ──green──▶ images ─▶ ghcr.io/giglabocom/beda-{api,web,backup}:<sha>, :main
                                                                   └─▶ deploy (migrations + server)
pull request ─▶ ci + images (build only, nothing pushed)
```

See `deploy/README.md` for production and `docs/engineering/quality-gate.md` for the
checks a change has to pass.
