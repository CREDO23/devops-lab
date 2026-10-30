#!/bin/sh
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export DBMATE_MIGRATIONS_DIR="${DBMATE_MIGRATIONS_DIR:-$here/migrations}"
export DBMATE_SCHEMA_FILE="${DBMATE_SCHEMA_FILE:-$here/schema.sql}"

warn_if_schema_misses_a_migration() {
  missing=""
  for migration in "$DBMATE_MIGRATIONS_DIR"/*.sql; do
    name=${migration##*/}
    grep -q "('${name%%_*}')" "$DBMATE_SCHEMA_FILE" 2>/dev/null || missing="$missing $name"
  done
  [ -n "$missing" ] || return 0
  echo "" >&2
  echo "!!! WARNING: schema.sql misses these migrations:$missing" >&2
  echo "!!! It no longer matches the migrations. Run make db-migrate with pg_dump to update it." >&2
  echo "" >&2
}

: "${PG_DUMP_COMMAND:=$(sed -n 's/^PG_DUMP_COMMAND=//p' .env 2>/dev/null)}"
: "${PG_DUMP_COMMAND:=$(command -v pg_dump)}"
if [ -z "$PG_DUMP_COMMAND" ]; then
  echo "note: no pg_dump found, so schema.sql is not updated" >&2
  "$here/node_modules/.bin/dbmate" "$@"
  status=$?
  [ "$1" = "new" ] || warn_if_schema_misses_a_migration
  exit "$status"
fi

PG_DUMP_ERRORS=$(mktemp)
export PG_DUMP_COMMAND PG_DUMP_ERRORS
PATH="$here/tools:$PATH" "$here/node_modules/.bin/dbmate" "$@"
status=$?
if [ -s "$PG_DUMP_ERRORS" ]; then
  echo "error: schema.sql was not updated, pg_dump failed: $(cat "$PG_DUMP_ERRORS")" >&2
  echo "fix it, then run ./run-dbmate.sh dump from app/db" >&2
  [ "$status" -eq 0 ] && status=1
fi
rm -f "$PG_DUMP_ERRORS"
exit "$status"
