# syntax=docker/dockerfile:1
# Nightly encrypted pg_dump of the Supabase database to S3-compatible storage.
# Build context: the repository root.
#   docker build -f deploy/backup/Dockerfile -t ghcr.io/giglabocom/beda-backup:local .

ARG ALPINE_IMAGE=alpine:3.23

FROM ${ALPINE_IMAGE}
# Client major must be >= the Supabase Postgres major (17, see supabase/config.toml).
RUN apk add --no-cache bash ca-certificates tzdata tini \
      postgresql17-client age rclone supercronic \
 && adduser -D -H -u 10001 backup
COPY deploy/scripts/backup.sh /usr/local/bin/backup.sh
COPY deploy/scripts/restore.sh /usr/local/bin/restore.sh
COPY deploy/backup/crontab /etc/beda/crontab
USER backup
WORKDIR /tmp
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["supercronic", "-passthrough-logs", "/etc/beda/crontab"]
