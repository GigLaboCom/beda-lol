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
sudo -u deploy nano /opt/beda/web.env   # web: Supabase URL and publishable key
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
- `BACKUP_*` and `RCLONE_CONFIG_S3_*` — bucket for backups, `age` public key.
  Create the key pair on **your** machine: `age-keygen -o beda-backup.key` — keep the file offline,
  put only the `age1…` public key on the server.

## 4a. Supabase project (dashboard)

Auth settings live in the dashboard; `supabase/config.toml` is for the local stack only
(do not `supabase config push` it: it would set the site URL to localhost).

| Where | Setting |
| --- | --- |
| Project Settings → JWT Keys | **Asymmetric signing keys** (ES256): create a key and rotate to it. The API accepts only ES256/RS256 tokens verified against the JWKS; with the legacy HS256 secret every signed-in request gets 401. |
| Authentication → URL Configuration | Site URL `https://beda.lol`; Redirect URLs `https://beda.lol/**` |
| Authentication → Sign In / Providers → Email | enabled, sign-ups allowed |
| Authentication → Sign In / Providers → GitHub | enabled; Client ID and Secret of the production OAuth app (below) |
| Authentication → Emails → SMTP (S18) | custom SMTP from a verified sending domain; the built-in mailer is for tests only |
| Authentication → Emails → Templates → Magic link | subject «Вход на beda.lol», body from `supabase/templates/magic_link.html` |
| SQL editor | `alter role beda_api password '…';` (the same password goes into `BEDA_DATABASE_URL`) |

**GitHub OAuth app (production).** GitHub → organisation GigLaboCom → Settings → Developer
settings → OAuth Apps → New OAuth App:

- Homepage URL: `https://beda.lol`
- Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

Generate a client secret and paste the Client ID and the secret into the GitHub provider in
the Supabase dashboard. The secret goes nowhere else. For local development create a second
app (see `docs/local-dev.md`): an OAuth app has one callback URL.

After the first release, check sign-in on `https://beda.lol/dev/auth` (magic link and GitHub),
then promote yourself (after one GitHub sign-in):

```sh
cd /opt/beda/src && BEDA_TAG=$(cat /opt/beda/.last_good) docker compose -f deploy/compose.yaml \
  exec api beda-api admin promote <github-login> --role admin
```

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
