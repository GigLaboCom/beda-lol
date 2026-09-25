# deploy

Production runs on one VPS with Docker Compose. Everything is served from one address:
Caddy terminates TLS and sends `/api/*` to the Rust API and everything else to Astro.

```
browser ──▶ caddy :80/:443 ──/api/*──▶ api  (ghcr.io/giglabocom/beda-api:<sha>, :8080)
                          └──other───▶ web  (ghcr.io/giglabocom/beda-web:<sha>, :4321)
api ──▶ Supabase Postgres (BEDA_DATABASE_URL, role beda_api)
```

| File | What |
| --- | --- |
| `compose.yaml` | services `caddy`, `web`, `api`, `backup` (S06); only caddy publishes ports |
| `Caddyfile` | site address from `BEDA_SITE_ADDRESS`; `BEDA_TLS_INTERNAL=1` uses Caddy's local CA |
| `.env.example` | every variable the stack reads; the real file is `/opt/beda/.env` (mode 600) |

## Database

There is **no Postgres container**: the database is the Supabase project (amendment П-1).
`BEDA_DATABASE_URL` points at it as role `beda_api`, through the session pooler or a direct
connection (never the transaction pooler). Migrations are applied by the deploy workflow with
the Supabase CLI (`supabase db push`, S06) **before** new containers start — the api container
never migrates.

## Variables read by compose

| Variable | Default | Meaning |
| --- | --- | --- |
| `BEDA_TAG` | — (required) | image tag: the git SHA in prod, `local` for `task prod:up` |
| `BEDA_ENV_FILE` | `/opt/beda/.env` | env file for web, api and backup |
| `BEDA_SITE_ADDRESS` | `beda.lol` | Caddy site address |
| `BEDA_TLS_INTERNAL` | `0` | `1` = self-signed local CA (for `localhost`) |

## Locally

```sh
supabase start && task db:dev-role
task prod:build      # both images tagged `local`
task prod:up         # https://localhost (accept Caddy's local CA), api → local Supabase
task prod:down
```

`prod:up` writes `tmp/prod-local.env` with a `BEDA_DATABASE_URL` that reaches the host's
Supabase through `host.docker.internal`.
