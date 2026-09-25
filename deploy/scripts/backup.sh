#!/usr/bin/env bash
# Encrypted logical backup of the Supabase database, independent of Supabase's
# own backups. Dumps schemas `app` and `auth`, encrypts to an age public key,
# uploads with rclone and prunes to 14 daily / 8 weekly / 6 monthly copies.
#
# Env:
#   BACKUP_DATABASE_URL   connection string with read access (session pooler or direct)
#   BACKUP_AGE_RECIPIENT  age public key (age1…); the private key stays offline
#   BACKUP_REMOTE         rclone destination, e.g. `s3:beda-backups/db`
#                         (S3 credentials through RCLONE_CONFIG_S3_* variables)
#   BACKUP_KEEP_DAILY / _WEEKLY / _MONTHLY   retention, default 14 / 8 / 6
set -euo pipefail

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE is required}"
KEEP_DAILY=${BACKUP_KEEP_DAILY:-14}
KEEP_WEEKLY=${BACKUP_KEEP_WEEKLY:-8}
KEEP_MONTHLY=${BACKUP_KEEP_MONTHLY:-6}

log() {
  printf '%s backup: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

# Prints the files to delete: everything outside the retention windows.
# Input: backup names, one per line. Names sort by time: beda-YYYY-MM-DDTHHMMSSZ.dump.age
select_expired() {
  local -A days=() weeks=() months=() keep=()
  local -a files=()
  local f d w m
  mapfile -t files < <(sort -r)
  for f in "${files[@]}"; do
    d=${f:5:10}
    w=$(date -u -d "$d" +%G-%V)
    m=${d:0:7}
    if [[ -z ${days[$d]:-} ]] && ((${#days[@]} < KEEP_DAILY)); then
      days[$d]=1
      keep[$f]=1
    fi
    if [[ -z ${weeks[$w]:-} ]] && ((${#weeks[@]} < KEEP_WEEKLY)); then
      weeks[$w]=1
      keep[$f]=1
    fi
    if [[ -z ${months[$m]:-} ]] && ((${#months[@]} < KEEP_MONTHLY)); then
      months[$m]=1
      keep[$f]=1
    fi
  done
  for f in "${files[@]}"; do
    [[ -n ${keep[$f]:-} ]] || printf '%s\n' "$f"
  done
}

main() {
  if [[ ${1:-} == --select-expired ]]; then
    select_expired
    return
  fi

  local work name size
  work=$(mktemp -d)
  # shellcheck disable=SC2064 # expand now: `work` is local and gone by EXIT
  trap "rm -rf '$work'" EXIT
  name="beda-$(date -u +%Y-%m-%dT%H%M%SZ).dump.age"

  log "dumping schemas app and auth"
  pg_dump --format=custom --schema=app --schema=auth "$BACKUP_DATABASE_URL" |
    age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" >"$work/$name"
  size=$(wc -c <"$work/$name")
  if ((size < 1024)); then
    log "dump is suspiciously small ($size bytes), not uploading"
    exit 1
  fi

  log "uploading $name ($size bytes) to $BACKUP_REMOTE"
  rclone copyto --quiet "$work/$name" "$BACKUP_REMOTE/$name"

  log "pruning to $KEEP_DAILY daily / $KEEP_WEEKLY weekly / $KEEP_MONTHLY monthly"
  rclone lsf --files-only --include 'beda-*.dump.age' "$BACKUP_REMOTE" |
    select_expired |
    while read -r old; do
      log "deleting $old"
      rclone deletefile --quiet "$BACKUP_REMOTE/$old"
    done
  log "done"
}

main "$@"
