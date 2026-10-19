#!/usr/bin/env bash
# Production database manager for the compose.yaml stack. Every schema change
# is preceded by a dump; see docs/production-database.md.
#
# Usage: IMAGE_TAG=<version> deployment/production/database.sh <command> [args]
#   backup                  dump the live database into backups/
#   migrate [--dump <file>] stop app, dump (or use <file>), run db:migrate
#   fresh [dump]            on an empty database: restore [dump] if given, run db:migrate
#
# backup does not need IMAGE_TAG. migrate and fresh run migrations from the
# IMAGE_TAG image, and leave app stopped; start it with:
#   IMAGE_TAG=<version> docker compose up -d
#
# DATABASE_COMPOSE_FILE=<file> targets another compose file (a stand-in);
# it needs postgres and app services shaped like compose.yaml's.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Override only to rehearse against a stand-in stack; defaults to the live stack
COMPOSE_FILE="${DATABASE_COMPOSE_FILE:-$REPO_ROOT/compose.yaml}"
BACKUP_DIR="$REPO_ROOT/backups"

# Set by cmd_backup or migrate --dump; reported on failure
DUMP_FILE=""

fail() {
    echo "database: $*" >&2
    exit 1
}

compose() {
    docker compose -f "$COMPOSE_FILE" "$@"
}

# The compose invocation an operator should type, for printed hints
compose_hint() {
    if [ -n "${DATABASE_COMPOSE_FILE:-}" ]; then
        echo "docker compose -f $COMPOSE_FILE"
    else
        echo "docker compose"
    fi
}

require_image_tag() {
    [ -n "${IMAGE_TAG:-}" ] || fail "IMAGE_TAG is not set (the app version whose migrations to run)"
    export IMAGE_TAG
}

require_postgres() {
    # Surface compose's own error (e.g. interpolation) before the running check hides it
    compose config -q || fail "$COMPOSE_FILE does not resolve; see the compose error above"
    [ -n "$(compose ps --status running -q postgres)" ] || fail "postgres is not running; run: $(compose_hint) up -d postgres"
}

# Runs in the postgres container so the database name comes from its env,
# never from parsing .env
pg_exec() {
    compose exec -T postgres sh -c "$1"
}

require_dump() {
    [ -f "$1" ] || fail "dump not found: $1"
    pg_exec 'pg_restore --list' < "$1" > /dev/null || fail "not a readable pg_dump custom-format archive: $1"
}

require_empty_database() {
    local count
    count="$(pg_exec 'psql -X -U postgres -d "$POSTGRES_DB" -tA' \
        <<< "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d '[:space:]')"
    [ "$count" = "0" ] || fail "database has $count table(s) in public; fresh only runs against an empty database"
}

run_migrations() {
    # --no-deps: postgres is already up; no --service-ports, so the live ports stay free
    compose run --rm --no-deps app node node_modules/sequelize-cli/lib/sequelize db:migrate
}

cmd_backup() {
    require_postgres
    mkdir -p "$BACKUP_DIR"

    local db
    db="$(pg_exec 'printf %s "$POSTGRES_DB"')"
    DUMP_FILE="$BACKUP_DIR/${db}-$(date -u +%Y%m%dT%H%M%SZ).dump"

    if ! pg_exec 'pg_dump -U postgres -Fc "$POSTGRES_DB"' > "$DUMP_FILE"; then
        rm -f "$DUMP_FILE"
        fail "pg_dump failed; no dump written"
    fi
    [ -s "$DUMP_FILE" ] || { rm -f "$DUMP_FILE"; fail "pg_dump produced an empty file"; }

    echo "database: dump written to $DUMP_FILE"
}

cmd_migrate() {
    local supplied=""
    if [ "${1:-}" = "--dump" ]; then
        [ -n "${2:-}" ] || fail "--dump needs a file argument"
        supplied="$2"
    elif [ -n "${1:-}" ]; then
        fail "unknown argument: $1"
    fi

    require_image_tag
    require_postgres

    # Validate a supplied dump before anything is stopped
    [ -z "$supplied" ] || require_dump "$supplied"

    # Nothing may write between the dump and the migration
    compose stop app

    if [ -n "$supplied" ]; then
        DUMP_FILE="$supplied"
        echo "database: using supplied dump $DUMP_FILE"
    else
        cmd_backup
    fi

    run_migrations || fail "db:migrate failed; app is stopped; restore point: $DUMP_FILE"

    echo "database: migrated; start the app with: IMAGE_TAG=$IMAGE_TAG $(compose_hint) up -d"
}

cmd_fresh() {
    local dump="${1:-}"

    require_image_tag
    require_postgres
    require_empty_database
    [ -z "$dump" ] || require_dump "$dump"

    compose stop app

    if [ -n "$dump" ]; then
        # --single-transaction: a failed restore leaves the database empty
        pg_exec 'pg_restore -U postgres -d "$POSTGRES_DB" --no-owner --single-transaction' < "$dump" \
            || fail "restore failed; database left empty"
        echo "database: restored $dump"
    fi

    run_migrations || fail "db:migrate failed; app is stopped"

    echo "database: ready; start the app with: IMAGE_TAG=$IMAGE_TAG $(compose_hint) up -d"
}

command="${1:-}"
shift || true

case "$command" in
    backup) cmd_backup ;;
    migrate) cmd_migrate "$@" ;;
    fresh) cmd_fresh "$@" ;;
    *) fail "usage: database.sh {backup|migrate [--dump <file>]|fresh [dump]}" ;;
esac
