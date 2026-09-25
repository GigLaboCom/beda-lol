#!/usr/bin/env bash
# Deploys one commit to the server. Run by the forced-command SSH key of the
# `deploy` user: the GitHub workflow connects with `ssh deploy@host "<sha>"`,
# so the SHA arrives in SSH_ORIGINAL_COMMAND (or as $1 when run by hand).
#
# Migrations are applied by the workflow (supabase db push) BEFORE this runs,
# and stay backward compatible, because a rollback does not undo them.
#
# The whole body lives in main(): bash parses it completely before running,
# so updating the checkout this file lives in is safe.
set -euo pipefail

BEDA_HOME=${BEDA_HOME:-/opt/beda}
BEDA_SRC=${BEDA_SRC:-$BEDA_HOME/src}
PUBLIC_URL=${BEDA_PUBLIC_URL:-https://beda.lol}
HEALTH_TIMEOUT=${BEDA_HEALTH_TIMEOUT:-60}
SERVICES=(api web backup)

log() {
  printf '%s deploy: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

compose() {
  docker compose -f "$BEDA_SRC/deploy/compose.yaml" "$@"
}

healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  while ((SECONDS < deadline)); do
    if curl -fsS -o /dev/null --max-time 5 "$PUBLIC_URL/api/readyz" &&
      curl -fsS -o /dev/null --max-time 5 "$PUBLIC_URL/"; then
      return 0
    fi
    sleep 3
  done
  return 1
}

main() {
  local sha=${SSH_ORIGINAL_COMMAND:-${1:-}}
  if [[ ! $sha =~ ^[0-9a-f]{40}$ ]]; then
    log "refusing: expected a 40-character lowercase git SHA, got '${sha}'"
    exit 2
  fi

  exec 9>"$BEDA_HOME/.deploy.lock"
  if ! flock -w 300 9; then
    log "another deploy holds the lock for more than 5 minutes"
    exit 1
  fi

  log "deploying $sha"
  log "checking out compose files at $sha"
  git -C "$BEDA_SRC" fetch --quiet --depth 1 origin "$sha"
  git -C "$BEDA_SRC" checkout --quiet --detach FETCH_HEAD

  export BEDA_TAG=$sha
  log "pulling images"
  compose pull --quiet "${SERVICES[@]}"
  log "starting containers"
  compose up -d --remove-orphans "${SERVICES[@]}"
  compose up -d caddy

  log "waiting up to ${HEALTH_TIMEOUT}s for $PUBLIC_URL"
  if healthy; then
    echo "$sha" >"$BEDA_HOME/.last_good"
    log "healthy, $sha is live"
    exit 0
  fi

  log "health check failed for $sha"
  if [[ -s $BEDA_HOME/.last_good ]]; then
    local good
    good=$(cat "$BEDA_HOME/.last_good")
    log "rolling back to $good"
    git -C "$BEDA_SRC" fetch --quiet --depth 1 origin "$good"
    git -C "$BEDA_SRC" checkout --quiet --detach FETCH_HEAD
    BEDA_TAG=$good compose up -d "${SERVICES[@]}"
    if healthy; then
      log "rollback to $good is healthy"
    else
      log "rollback to $good is NOT healthy either — look at the server"
    fi
  else
    log "no last good release recorded, nothing to roll back to"
  fi
  exit 1
}

main "$@"
