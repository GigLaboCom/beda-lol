# Server setup (runbook for the human)

One VPS (2 vCPU, 4 GB RAM, 80 GB SSD is plenty), Debian 13 or Ubuntu 24.04. Run the blocks
in order as root unless stated otherwise. Region: see the personal-data question
(`docs/08-amendments.md`, П-1 rule 8).

## 1. OS, firewall, SSH

```sh
apt-get update && apt-get -y full-upgrade
apt-get -y install unattended-upgrades ufw curl git ca-certificates
dpkg-reconfigure -f noninteractive unattended-upgrades

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp   # HTTP/3
ufw --force enable

# Key-only SSH (make sure your own key is in /root/.ssh/authorized_keys first!)
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh
```

## 2. Docker Engine + compose plugin

```sh
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(. /etc/os-release; echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker compose version
```

## 3. User `deploy` and `/opt/beda`

```sh
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy -m 750 /opt/beda

# Read-only checkout of the public repo: compose files, Caddyfile and scripts.
sudo -u deploy git clone --depth 1 https://github.com/GigLaboCom/beda-lol.git /opt/beda/src
```

`deploy.sh` checks out `/opt/beda/src` at the deployed commit on every release, so compose and
Caddy config always match the running images.

## 4. `/opt/beda/.env` and `/opt/beda/web.env` (by hand)

```sh
sudo -u deploy cp /opt/beda/src/deploy/.env.example /opt/beda/.env
sudo -u deploy cp /opt/beda/src/deploy/web.env.example /opt/beda/web.env
sudo -u deploy chmod 600 /opt/beda/.env /opt/beda/web.env
sudo -u deploy nano /opt/beda/.env      # api + backup: fill in every value
sudo -u deploy nano /opt/beda/web.env   # web: Supabase URL, publishable key, Turnstile site key
```

The web container reads only `web.env`, which holds public values; the database and backup
secrets in `.env` reach the api and backup containers only.

> **Deviation from the spec:** the spec says the workflow writes `.env` on every deploy. With a
> forced-command deploy key the workflow can only pass a SHA, so `.env` is maintained by hand
> here. Secrets never pass through GitHub Actions to the server.

What goes in (see comments in `.env.example`):

- `BEDA_DATABASE_URL` — Supabase **session pooler** (or direct if the VPS has IPv6), role `beda_api`.
  Set the role's password once in the Supabase SQL editor: `alter role beda_api password '…';`
- `BEDA_SUPABASE_URL` — `https://<project-ref>.supabase.co`, in both files.
- `BEDA_SUPABASE_PUBLISHABLE_KEY` (`web.env`) — Dashboard → Project Settings → API Keys.
- `BEDA_SUPABASE_SECRET_KEY` (`.env` only) — Dashboard → Project Settings → API Keys → Secret
  keys: create one named `beda-api`. The API deletes accounts with it (Auth Admin API). It is
  the one Supabase secret on the server: never in `web.env`, images or CI.
- `BEDA_TURNSTILE_SITE_KEY` (`web.env`) — the Turnstile widget's site key (§4a).
- `BEDA_GA_ID` (`web.env`) — the GA4 measurement id, `G-…` (§4b). Empty: no analytics, no banner.
- `BACKUP_*` and `RCLONE_CONFIG_S3_*` — bucket for backups, `age` public key.
  Create the key pair on **your** machine: `age-keygen -o beda-backup.key` — keep the file offline,
  put only the `age1…` public key on the server.

## 4a. Supabase project (dashboard)

Auth settings live in the dashboard; `supabase/config.toml` is for the local stack only
(do not `supabase config push` it: it would set the site URL to localhost).

**Script first.** `deploy/scripts/supabase-setup.sh` does most of the table below through the
Management API. Run it on your machine (bash, curl, jq, openssl) with a personal access token
(dashboard → Account → Access Tokens); it is safe to re-run:

```sh
SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROJECT_REF=<project-ref> BEDA_API_DB_PASSWORD=generate \
  deploy/scripts/supabase-setup.sh
```

- It sets the site URL and redirect URLs, turns on e-mail sign-in and turns off manual linking.
- It sets both mail templates, with the subject from `supabase/config.toml` and the body from
  `supabase/templates/sign_in.html`.
- It creates the API's secret key `beda_api`, or reuses it on a re-run.
- With `BEDA_API_DB_PASSWORD=generate`, it sets a new password for role `beda_api`.
- It warns if tokens are not signed with an asymmetric key.

Add `GITHUB_CLIENT_ID` and `GITHUB_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_SECRET`, `X_CLIENT_ID`
and `X_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
and `SMTP_ADMIN_EMAIL`, and later `TURNSTILE_SECRET`, to set those too. Secrets are not
printed. A provider left out keeps what the project has, so the apps can come one at a time.
The values for `/opt/beda/.env` and `web.env` go to `./supabase-setup.env` (mode 600,
gitignored): copy them over, then delete the file. Among them is `BEDA_AUTH_PROVIDERS`, the
providers the project has on: the site shows a button for each and none for the rest, so
re-run the script (and restart web) whenever a provider is added. Afterwards only the asymmetric JWT key, if
the script warned, and the rate limits are left for the dashboard.

| Where | Setting |
| --- | --- |
| Project Settings → JWT Keys | **Asymmetric signing keys** (ES256): create a key and rotate to it. The API accepts only ES256/RS256 tokens verified against the JWKS; with the legacy HS256 secret every signed-in request gets 401. |
| Authentication → URL Configuration | Site URL `https://beda.lol`; Redirect URLs `https://beda.lol/**` |
| Authentication → Sign In / Providers → Email | enabled, sign-ups allowed |
| Authentication → Sign In / Providers → GitHub, Google, X / Twitter (OAuth 2.0) | enabled; Client ID and Secret of each production app (below). For X take «X / Twitter (OAuth 2.0)», not the legacy «Twitter (OAuth 1.0a)» |
| Authentication → Emails → SMTP Settings | custom SMTP (below); the built-in mailer is for tests only and sends a few mails an hour |
| Authentication → Emails → Templates → Magic link **and** Confirm signup | both: subject and body as in `supabase/config.toml` and `supabase/templates/sign_in.html`. Both are templates that pick English when the user signed up from `/en/voiti` (`lang` in the user metadata), Russian otherwise. A new address gets Confirm signup when «Confirm email» is on; the mail is the same either way |
| Authentication → Rate Limits | emails per hour: check the value once SMTP is on and raise it if sign-ins hit the limit |
| Authentication → Attack Protection → Captcha | Turnstile, the widget's secret key (below). Turn it on **after** the site key is in `web.env` and web restarted, or e-mail sign-in fails |
| SQL editor | `alter role beda_api password '…';` (the same password goes into `BEDA_DATABASE_URL`) |

**GitHub OAuth app (production).** GitHub → organisation GigLaboCom → Settings → Developer
settings → OAuth Apps → New OAuth App:

- Homepage URL: `https://beda.lol`
- Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

Generate a client secret and paste the Client ID and the secret into the GitHub provider in
the Supabase dashboard. The secret goes nowhere else. For local development create a second
app (see `docs/local-dev.md`): an OAuth app has one callback URL.

**Google OAuth client (production).** Google Cloud console → a project for beda.lol:

- Google Auth Platform → Branding: app name «Яхта Беда», support e-mail, home page
  `https://beda.lol`, privacy policy `https://beda.lol/konfidencialnost` and terms `https://beda.lol/pravila`, authorised
  domains `beda.lol` and `supabase.co`. Audience: External, then Publish app (in Testing only
  listed test users can sign in).
- Data Access: scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, nothing
  else (these need no verification).
- Clients → Create client → Web application: Authorised JavaScript origins `https://beda.lol`,
  Authorised redirect URIs `https://<project-ref>.supabase.co/auth/v1/callback`.

The client ID and secret go to the script as `GOOGLE_CLIENT_ID` / `GOOGLE_SECRET`.

**X app (production).** developer.x.com → Projects & Apps → a project → an app → User
authentication settings → Set up:

- App permissions: Read, and **Request email from users** on (Supabase needs the address;
  without it sign-in fails).
- Type of App: Web App (a confidential client).
- Callback URI `https://<project-ref>.supabase.co/auth/v1/callback`, website `https://beda.lol`,
  terms of service `https://beda.lol/pravila` and privacy policy `https://beda.lol/konfidencialnost`
  (X requires both for the e-mail permission).

Keys and tokens → OAuth 2.0 Client ID and Client Secret go to the script as `X_CLIENT_ID` /
`X_SECRET`. An X account without a confirmed e-mail cannot sign in; such people use another way.

**Sending domain and SMTP.** Sign-in mail goes out from a verified sending domain (tactic 11:
`.lol` has a weaker reputation with mail filters, so the sender may be another domain of
ours). Pick a transactional mail provider, verify the domain there (its SPF and DKIM records,
plus a `DMARC` record `v=DMARC1; p=none; rua=mailto:<you>` to start), then fill in the SMTP
settings: host, port, user, password from the provider; sender `vhod@<sending-domain>`,
name «Яхта Беда». Send yourself a sign-in from `/dev/auth` and check it lands in the inbox, not
spam, in Gmail and Yandex Mail.

**Turnstile widget.** Cloudflare dashboard → Turnstile → Add widget: hostname `beda.lol`,
mode Managed. The site key goes into `web.env` as `BEDA_TURNSTILE_SITE_KEY` (then
`docker compose -f deploy/compose.yaml up -d web` with the current `BEDA_TAG`), the secret key
into Attack Protection in the Supabase dashboard. Nowhere else.

After the first release, check sign-in on `https://beda.lol/voiti` (magic link, code, GitHub,
Google and X; `/dev/auth` shows what the server and the API see), the cabinet `https://beda.lol/kabinet`
(sign-out, sign-out on all devices), then promote yourself (after one GitHub sign-in):

```sh
cd /opt/beda/src && BEDA_TAG=$(cat /opt/beda/.last_good) docker compose -f deploy/compose.yaml \
  exec api beda-api admin promote <github-login> --role admin
```

## 4b. Google Analytics and the cookie banner's region check

The site runs GA4 in Consent Mode, as the sibling GigLabo sites do (lookbook, stereola,
moat-atlas): consent denied until a choice, cookies only after it. Visitors in the EU (and
anyone the region check cannot place) see the banner; elsewhere consent is granted without
asking. `/cookies` changes the choice. Code: `apps/web/src/lib/{analytics,consent}.ts`.

**GA4 property.** analytics.google.com → Admin → Create property `beda.lol` → Web stream for
`https://beda.lol`. Copy the measurement id `G-…` into `BEDA_GA_ID` in `/opt/beda/web.env` and
restart web (`docker compose … up -d web`); `/analytics.js` then sets gtag up (runtime, no rebuild).
In the property keep advertising off: Admin → Data collection → **Google signals off**, and no
Google Ads links. Set the data retention you want (Admin → Data retention) and write it into
`/konfidencialnost`.

**Region check.** The banner asks `/api-shared/ip` on the site's own origin. Caddy sends it to the
`shared` service (GigLabo `shared-service`, github.com/glani/shared-service): it takes the
visitor's address from Caddy (`X-Real-Ip`; forged `Cf-Connecting-Ip` and friends are dropped),
asks ipregistry.co and answers `{status, ip: {isEu}}` only. Without the service Caddy answers
502 and the banner asks everyone, which is the safe failure. To run it on this VPS:

```sh
# The shared-service image (it is in the private GigLabo registry; `docker login` there first,
# as the deploy user) and its ipregistry.co key:
sudo -u deploy tee /opt/beda/shared.env >/dev/null <<'ENV'
IP_REGISTRY_CO_KEY=<ipregistry.co API key>
ENV
sudo -u deploy chmod 600 /opt/beda/shared.env
cd /opt/beda/src && sudo -u deploy env BEDA_TAG=$(cat /opt/beda/.last_good) \
  BEDA_SHARED_IMAGE=<registry>/shared-service/shared-service-x86_64:<version> \
  docker compose -f deploy/compose.yaml --profile shared up -d shared
curl -s https://beda.lol/api-shared/ip   # {"status":"OK","ip":{"isEu":…}}
```

The service is not part of a release: `deploy.sh` leaves it running (its `--remove-orphans`
keeps profile services). Update it the same way with a new image. Why not call the instance
the cluster already runs (behind `lookbook.giglabo.com`): that host is behind Cloudflare, which
sets `Cf-Connecting-Ip` to this server's address, so every visitor would be placed where the VPS
is. The Caddyfile's upstream can still be changed with `BEDA_SHARED_UPSTREAM`, which `deploy.sh`
does not pass: set it for every compose run if you use it.

## 5. Deploy key with a forced command

On your machine: `ssh-keygen -t ed25519 -f beda-deploy -C "github-actions deploy" -N ""`.
On the server, one line in `~deploy/.ssh/authorized_keys`:

```
restrict,command="/opt/beda/src/deploy/scripts/deploy.sh" ssh-ed25519 AAAA… github-actions deploy
```

```sh
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
```

`restrict` disables forwarding, PTY and agent; the key can only run `deploy.sh <sha>`.
Put the **private** key into the GitHub secret `DEPLOY_SSH_KEY`, and the output of
`ssh-keyscan -t ed25519 <server>` into `SSH_KNOWN_HOSTS`.

## 6. DNS

| Record | Value |
| --- | --- |
| `A beda.lol` | VPS IPv4 |
| `AAAA beda.lol` | VPS IPv6 (if any) |
| `CAA beda.lol` | `0 issue "letsencrypt.org"` |

## 7. GitHub

- Environment `production` (Settings → Environments), deployment branches: `main` only.
  - Secrets: `DEPLOY_SSH_KEY`, `SSH_KNOWN_HOSTS`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
  - Variables: `DEPLOY_HOST`, `SUPABASE_PROJECT_REF`
- Repository variable (optional) `BEDA_BASE_URL` if the site moves off `https://beda.lol`.
- After the first green `images` run on `main`: make the packages `beda-api`, `beda-web`,
  `beda-backup` **public** (github.com/orgs/GigLaboCom/packages → package → Package settings →
  Change visibility → Public). The server then pulls without logging in.

## 8. First start

The first release has no `.last_good`, so start it once by hand after `images` has published:

```sh
sudo -u deploy /opt/beda/src/deploy/scripts/deploy.sh <full-sha-of-main>
```

Then every merge to `main` deploys by itself: `ci` → `images` → `deploy`.

## 9. Backups

The `backup` service runs `backup.sh` nightly at 02:15 UTC. Run one immediately and then a
restore drill (on the server, with the private key copied in temporarily):

```sh
cd /opt/beda/src && BEDA_TAG=$(cat /opt/beda/.last_good) docker compose -f deploy/compose.yaml exec backup backup.sh
BACKUP_AGE_IDENTITY=~/beda-backup.key BEDA_TAG=$(cat /opt/beda/.last_good) deploy/scripts/restore.sh latest
shred -u ~/beda-backup.key
```

Paste the report into `docs/steps/PROGRESS.md`.
