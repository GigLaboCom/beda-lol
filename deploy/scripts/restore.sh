#!/usr/bin/env bash
# Restore drill: downloads a backup (the given name or the latest), decrypts it
# and restores it into a THROWAWAY Postgres container, then prints a report.
# It never touches the production database.
#
# On the server (needs docker):
#   BACKUP_AGE_IDENTITY=~/beda-backup.key deploy/scripts/restore.sh [name|latest]
# The age private key is supplied at runtime and is never stored on the server.
#
# Env (outer): BACKUP_AGE_IDENTITY (path to the age private key file),
#   BEDA_ENV_FILE (default /opt/beda/.env: BACKUP_REMOTE and RCLONE_CONFIG_*),
#   BACKUP_IMAGE (default ghcr.io/giglabocom/beda-backup:$BEDA_TAG or :main).
# `--inner` is the part that runs inside the backup image.
set -euo pipefail

log() {
  printf '%s restore: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

inner() {
  local want=${1:-latest} work name
  : "${BACKUP_REMOTE:?BACKUP_REMOTE is required}"
  : "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
  local identity=${RESTORE_AGE_IDENTITY:-/run/age-key}
  work=$(mktemp -d)
  # shellcheck disable=SC2064 # expand now: `work` is local and gone by EXIT
  trap "rm -rf '$work'" EXIT

  if [[ $want == latest ]]; then
    name=$(rclone lsf --files-only --include 'beda-*.dump.age' "$BACKUP_REMOTE" | sort | tail -n 1)
    [[ -n $name ]] || {
      log "no backups found in $BACKUP_REMOTE"
      exit 1
    }
  else
    name=$want
  fi

  log "downloading $name"
  rclone copyto --quiet "$BACKUP_REMOTE/$name" "$work/$name"
  log "decrypting"
  age --decrypt --identity "$identity" --output "$work/dump" "$work/$name"

  log "restoring into the throwaway database"
  # Supabase-owned objects (roles, extensions) do not exist in a plain Postgres;
  # errors about them are expected and counted, the data tables must restore.
  local errors=0
  pg_restore --no-owner --no-privileges --dbname "$RESTORE_DATABASE_URL" "$work/dump" \
    2>"$work/restore.log" || errors=$(grep -c '^pg_restore: error' "$work/restore.log" || true)

  echo
  echo "=== restore report: $name ==="
  echo "pg_restore errors: $errors (see details below if non-zero)"
  psql "$RESTORE_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 <<'SQL'
\pset footer off
select t.table_schema || '.' || t.table_name as "table",
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text::bigint as "rows",
       case when exists (select 1 from information_schema.columns c
                         where c.table_schema = t.table_schema and c.table_name = t.table_name and c.column_name = 'created_at')
            then (xpath('/row/m/text()', query_to_xml(format('select max(created_at) as m from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text
       end as "latest created_at"
from information_schema.tables t
where t.table_schema in ('app', 'auth') and t.table_type = 'BASE TABLE'
order by 1;
SQL
  if ((errors > 0)); then
    echo "--- first pg_restore errors ---"
    grep '^pg_restore: error' "$work/restore.log" | head -n 20
  fi
}

outer() {
  local want=${1:-latest}
  : "${BACKUP_AGE_IDENTITY:?set BACKUP_AGE_IDENTITY to the age private key file}"
  local env_file=${BEDA_ENV_FILE:-/opt/beda/.env}
  local image=${BACKUP_IMAGE:-ghcr.io/giglabocom/beda-backup:${BEDA_TAG:-main}}
  local id=$$ net db
  net="beda-restore-$id"
  db="beda-restore-db-$id"

  # shellcheck disable=SC2064 # expand now: the names are locals
  trap "docker rm -f '$db' >/dev/null 2>&1 || true; docker network rm '$net' >/dev/null 2>&1 || true" EXIT

  log "starting a throwaway Postgres 17"
  docker network create "$net" >/dev/null
  docker run -d --name "$db" --network "$net" -e POSTGRES_PASSWORD=restore postgres:17-alpine >/dev/null
  for _ in $(seq 1 30); do
    docker exec "$db" pg_isready -U postgres -q && break
    sleep 1
  done

  docker run --rm --network "$net" --env-file "$env_file" \
    -e RESTORE_DATABASE_URL="postgresql://postgres:restore@$db:5432/postgres" \
    -v "$(realpath "$BACKUP_AGE_IDENTITY"):/run/age-key:ro" \
    --entrypoint /usr/local/bin/restore.sh "$image" --inner "$want"
}

if [[ ${1:-} == --inner ]]; then
  shift
  inner "$@"
else
  outer "$@"
fi
