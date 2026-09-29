#!/usr/bin/env bash
# Configures the production Supabase project through the Management API, so the
# dashboard steps of SERVER-SETUP.md §4a are one command. Safe to re-run.
#
#   SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROJECT_REF=<ref> deploy/scripts/supabase-setup.sh
#
# What it does:
#   - Auth: site URL, redirect URLs, e-mail sign-in on, manual linking off;
#   - the sign-in mail: subject from supabase/config.toml, body from
#     supabase/templates/sign_in.html, for both Magic link and Confirm signup;
#   - the API's secret key `beda_api` (created once, reused afterwards);
#   - checks that tokens are signed with an asymmetric key (the API needs it).
# Optional, when the variables are set:
#   BEDA_API_DB_PASSWORD=generate   a new password for role beda_api (or give one)
#   TURNSTILE_SECRET                Turnstile via Auth's CAPTCHA (set it only once the
#                                   site key is in web.env, or e-mail sign-in fails)
#   GITHUB_CLIENT_ID, GITHUB_SECRET the GitHub provider
#   GOOGLE_CLIENT_ID, GOOGLE_SECRET the Google provider
#   X_CLIENT_ID, X_SECRET           the X provider (OAuth 2.0)
#   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL [, SMTP_SENDER_NAME]
#
# A provider left out keeps what the project has. The web.env part lists every provider
# the project has on (BEDA_AUTH_PROVIDERS), so the site shows exactly those buttons.
#
# Secrets are never printed. Values for /opt/beda/.env and web.env go to
# $BEDA_SETUP_OUT (default ./supabase-setup.env, mode 600); copy them over and
# delete the file.
#
# Env: BEDA_SITE_URL (default https://beda.lol), SUPABASE_API (default
# https://api.supabase.com, for tests). Needs bash, curl, jq, openssl.
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required (dashboard → Account → Access Tokens)}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required (Project Settings → General)}"
SITE=${BEDA_SITE_URL:-https://beda.lol}
API=${SUPABASE_API:-https://api.supabase.com}
OUT=${BEDA_SETUP_OUT:-./supabase-setup.env}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PROJECT="$API/v1/projects/$SUPABASE_PROJECT_REF"

# The site's OAuth providers, as apps/web/src/lib/auth/providers.ts has them (a test keeps
# the two lists equal).
OAUTH_PROVIDERS=(github google x)

log() {
  printf 'supabase-setup: %s\n' "$*" >&2
}

# api METHOD PATH [JSON-BODY]: prints the response body, fails on a non-2xx answer.
api() {
  local method=$1 path=$2 body=${3:-} res status
  local -a args=(-sS -X "$method" -w '\n%{http_code}')
  if [[ -n $body ]]; then args+=(-H 'Content-Type: application/json' --data-binary @-); fi
  # The token goes in through a file descriptor, not argv (visible in ps). The process
  # substitution must sit on the curl line itself: bash closes it after its own command.
  res=$(printf '%s' "$body" |
    curl "${args[@]}" -H @<(printf 'Authorization: Bearer %s\n' "$SUPABASE_ACCESS_TOKEN") "$PROJECT$path")
  status=${res##*$'\n'}
  res=${res%$'\n'*}
  if [[ $status != 2* ]]; then
    log "$method $path answered $status: $(printf '%s' "$res" | head -c 300)"
    return 1
  fi
  printf '%s' "$res"
}

# The sign-in subject, as the local stack has it (one source for both).
subject() {
  sed -n "/^\[auth.email.template.magic_link\]/,/^\[/ s/^subject = '\(.*\)'$/\1/p" \
    "$ROOT/supabase/config.toml"
}

auth_config() {
  local subj body patch
  subj=$(subject)
  [[ -n $subj ]] || { log "no magic_link subject in supabase/config.toml"; return 1; }
  body=$(cat "$ROOT/supabase/templates/sign_in.html")
  patch=$(jq -n --arg site "$SITE" --arg subj "$subj" --arg body "$body" '{
    site_url: $site,
    uri_allow_list: ($site + "/**"),
    external_email_enabled: true,
    disable_signup: false,
    security_manual_linking_enabled: false,
    mailer_subjects_magic_link: $subj,
    mailer_templates_magic_link_content: $body,
    mailer_subjects_confirmation: $subj,
    mailer_templates_confirmation_content: $body
  }')
  if [[ -n ${TURNSTILE_SECRET:-} ]]; then
    patch=$(jq --arg s "$TURNSTILE_SECRET" \
      '. + {security_captcha_enabled: true, security_captcha_provider: "turnstile", security_captcha_secret: $s}' <<<"$patch")
    log "captcha: Turnstile on"
  fi
  local p up id secret
  for p in "${OAUTH_PROVIDERS[@]}"; do
    # Not ${p^^}: macOS ships bash 3.2.
    up=$(tr '[:lower:]' '[:upper:]' <<<"$p")
    id=${up}_CLIENT_ID secret=${up}_SECRET
    [[ -n ${!id:-} && -n ${!secret:-} ]] || continue
    patch=$(jq --arg p "$p" --arg id "${!id}" --arg s "${!secret}" \
      '. + {"external_\($p)_enabled": true, "external_\($p)_client_id": $id, "external_\($p)_secret": $s}' <<<"$patch")
    log "$p provider: on"
  done
  if [[ -n ${SMTP_HOST:-} ]]; then
    : "${SMTP_PORT:?SMTP_PORT is required with SMTP_HOST}" "${SMTP_USER:?}" "${SMTP_PASS:?}" "${SMTP_ADMIN_EMAIL:?}"
    patch=$(jq --arg h "$SMTP_HOST" --arg p "$SMTP_PORT" --arg u "$SMTP_USER" --arg pw "$SMTP_PASS" \
      --arg from "$SMTP_ADMIN_EMAIL" --arg name "${SMTP_SENDER_NAME:-Яхта Беда}" \
      '. + {smtp_host: $h, smtp_port: $p, smtp_user: $u, smtp_pass: $pw, smtp_admin_email: $from, smtp_sender_name: $name}' <<<"$patch")
    log "SMTP: $SMTP_HOST as $SMTP_ADMIN_EMAIL"
  fi
  api PATCH /config/auth "$patch" >/dev/null
  log "auth config: site $SITE, redirects $SITE/**, sign-in mail from the repo"
}

# Prints the value of the secret key `beda_api`, creating it on the first run.
secret_key() {
  local keys key
  keys=$(api GET '/api-keys?reveal=true')
  key=$(jq -r '[.[] | select(.type == "secret" and .name == "beda_api")][0].api_key // empty' <<<"$keys")
  if [[ -z $key ]]; then
    key=$(api POST '/api-keys?reveal=true' \
      '{"type":"secret","name":"beda_api","description":"beda.lol API: account deletion","secret_jwt_template":{"role":"service_role"}}' |
      jq -r '.api_key // empty')
    log "secret key beda_api: created"
  else
    log "secret key beda_api: exists, reused"
  fi
  [[ -n $key ]] || { log "no secret key value in the answer"; return 1; }
  printf '%s' "$key"
}

publishable_key() {
  api GET '/api-keys?reveal=true' | jq -r '[.[] | select(.type == "publishable")][0].api_key // empty'
}

# Sets the password of role beda_api; prints it.
db_password() {
  local pass=$BEDA_API_DB_PASSWORD
  [[ $pass == generate ]] && pass=$(openssl rand -hex 24)
  api POST /database/query "$(jq -n --arg q "alter role beda_api password '$pass'" '{query: $q}')" >/dev/null
  log "role beda_api: password set"
  printf '%s' "$pass"
}

# The site's providers the project has on, comma-separated, for BEDA_AUTH_PROVIDERS.
enabled_providers() {
  local list
  list=$(printf '%s\n' "${OAUTH_PROVIDERS[@]}" | jq -R . | jq -s .)
  api GET /config/auth |
    jq -r --argjson list "$list" '. as $c | [$list[] | select($c["external_\(.)_enabled"] == true)] | join(",")'
}

check_signing_keys() {
  local keys
  if ! keys=$(api GET /config/auth/signing-keys); then
    log "signing keys: could not read them; check Project Settings → JWT Keys by hand"
    return 0
  fi
  if jq -e '[(.keys // .)[] | select(.status == "in_use" and (.algorithm == "ES256" or .algorithm == "RS256"))] | length > 0' \
    <<<"$keys" >/dev/null; then
    log "signing keys: an asymmetric key is in use"
  else
    log "signing keys: WARNING, no ES256/RS256 key in use. Project Settings → JWT Keys → create and rotate to one, or every signed-in API call gets 401"
  fi
}

main() {
  local secret publishable providers pass=''
  command -v jq >/dev/null || { log "jq is required"; exit 1; }
  # Checked before anything changes; it also keeps the SQL literal and the URL safe.
  if [[ -n ${BEDA_API_DB_PASSWORD:-} && $BEDA_API_DB_PASSWORD != generate &&
    ! $BEDA_API_DB_PASSWORD =~ ^[A-Za-z0-9._~-]+$ ]]; then
    log "BEDA_API_DB_PASSWORD: use URL-safe characters only, or 'generate'"
    exit 1
  fi
  auth_config
  secret=$(secret_key)
  publishable=$(publishable_key)
  providers=$(enabled_providers)
  log "sign-in buttons: ${providers:-e-mail only}"
  if [[ -n ${BEDA_API_DB_PASSWORD:-} ]]; then pass=$(db_password); fi
  check_signing_keys

  (
    umask 077
    {
      echo "# From deploy/scripts/supabase-setup.sh. Copy into /opt/beda, then delete this file."
      echo "# /opt/beda/.env"
      echo "BEDA_SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co"
      echo "BEDA_SUPABASE_SECRET_KEY=$secret"
      if [[ -n $pass ]]; then
        echo "# password of role beda_api: put it into BEDA_DATABASE_URL"
        echo "BEDA_API_DB_PASSWORD=$pass"
      fi
      echo "# /opt/beda/web.env"
      echo "BEDA_SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co"
      echo "BEDA_SUPABASE_PUBLISHABLE_KEY=$publishable"
      echo "BEDA_AUTH_PROVIDERS=$providers"
    } >"$OUT"
  )
  log "values written to $OUT (mode 600)"
}

main "$@"
