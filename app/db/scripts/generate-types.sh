#!/bin/sh
# Migrates the database, then regenerates what the API and the worker know about its tables.
set -e
db_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
API_TYPES_FILE="${API_TYPES_FILE:-$db_directory/../api/src/database/generated-types.ts}"
WORKER_MODELS_FILE="${WORKER_MODELS_FILE:-$db_directory/../worker/src/kivu_ferry_worker/database/generated_models.py}"

: "${DATABASE_URL:=$(sed -n 's/^DATABASE_URL=//p' .env 2>/dev/null)}"
export DATABASE_URL

"$db_directory/scripts/run-dbmate.sh" up

mkdir -p "$(dirname -- "$API_TYPES_FILE")" "$(dirname -- "$WORKER_MODELS_FILE")"
cd "$db_directory/../api"
pnpm -s exec kysely-codegen --url "$DATABASE_URL" --dialect postgres --out-file "$API_TYPES_FILE" \
  --exclude-pattern schema_migrations --log-level warn
cd "$db_directory/../worker"
uv run -q sqlacodegen --outfile "$WORKER_MODELS_FILE" "postgresql+psycopg://${DATABASE_URL#*://}"
