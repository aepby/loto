#!/bin/sh
# Brings the database schema up to date, then starts the application.
# Runs on every container start and is safe to repeat.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "entrypoint: DATABASE_URL is not set, aborting." >&2
  exit 1
fi

# The database container may accept connections slightly before it is ready to
# serve queries, so migrations are retried for up to a minute.
attempt=1
max_attempts=30
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "entrypoint: database unreachable after ${max_attempts} attempts, aborting." >&2
    exit 1
  fi
  echo "entrypoint: database not ready (attempt ${attempt}/${max_attempts}), retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

# Creates the initial administrator; skipped when ADMIN_PASSWORD is unset and
# never overwrites an existing account.
npx prisma db seed

exec "$@"
