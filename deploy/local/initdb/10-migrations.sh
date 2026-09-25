#!/bin/sh
# Applies supabase/migrations/*.sql in order on the first start of the local
# database, then gives beda_api its dev-only password.
set -eu
for f in /migrations/*.sql; do  # globs expand in sorted order
  echo "applying $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -f "$f"
done
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q \
  -c "alter role beda_api password 'beda_api_dev'"
