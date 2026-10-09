#!/usr/bin/env bash
# Stage manager: a disposable compose project (compose.stage.yaml) whose
# Postgres is restored from a production dump, used to rehearse migrations
# before they reach production.
#
# Usage: STAGE_PG_IMAGE=postgres:<major> deployment/stage/stage.sh <command> [args]
#   up <dump>       start the stack, create databases, restore <dump>
#   reset <dump>    drop and recreate databases, restore <dump> again
#   migrate [db]    run sequelize-cli db:migrate against stage (default: live copy)
#   psql [db]       open psql in the container (default: live copy)
#   sql <file> [db] run a SQL file in the container (default: live copy)
#   seed-fresh      run the app's sync() + seed() against the empty database
#   check-responses load CommandResponseService against the migrated copy; report missing text
#   down            remove the stack and its anonymous volumes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.stage"
COMPOSE_FILE="$SCRIPT_DIR/compose.stage.yaml"

# Must match compose.stage.yaml
CONTAINER="sab-stage"
PORT="6433"
PG_USER="postgres"
DB_COPY="stream-assist-bot-stage"
DB_FRESH="stream-assist-bot-stage-fresh"

fail() {
    echo "stage: $*" >&2
    exit 1
}

compose() {
    docker compose -f "$COMPOSE_FILE" "$@"
}

container_exists() {
    [ -n "$(docker ps -aq --filter "name=^${CONTAINER}$")" ]
}

require_container() {
    container_exists || fail "container '$CONTAINER' is not up; run: stage.sh up <dump>"
}

require_dump() {
    [ -n "${1:-}" ] || fail "missing <dump> argument"
    [ -f "$1" ] || fail "dump not found: $1"
}

# Git Bash (mintty) needs winpty for an interactive docker exec
tty_prefix() {
    if command -v winpty > /dev/null 2>&1; then
        echo "winpty"
    fi
}

wait_ready() {
    for _ in $(seq 1 30); do
        if docker exec "$CONTAINER" pg_isready -U "$PG_USER" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    fail "postgres in '$CONTAINER' did not become ready"
}

create_databases() {
    docker exec "$CONTAINER" createdb -U "$PG_USER" "$DB_COPY"
    docker exec "$CONTAINER" createdb -U "$PG_USER" "$DB_FRESH"
}

drop_databases() {
    docker exec "$CONTAINER" dropdb -U "$PG_USER" --if-exists "$DB_COPY"
    docker exec "$CONTAINER" dropdb -U "$PG_USER" --if-exists "$DB_FRESH"
}

restore() {
    docker exec -i "$CONTAINER" pg_restore -U "$PG_USER" -d "$DB_COPY" --no-owner < "$1"
}

cmd_up() {
    require_dump "${1:-}"
    [ -n "${STAGE_PG_IMAGE:-}" ] || fail "STAGE_PG_IMAGE is not set (e.g. postgres:17; match or exceed production's major)"
    container_exists && fail "container '$CONTAINER' already exists; use reset or down"

    compose up -d --wait

    wait_ready
    create_databases
    restore "$1"
    echo "stage: up on localhost:$PORT ($DB_COPY restored, $DB_FRESH empty)"
}

cmd_reset() {
    require_dump "${1:-}"
    require_container
    drop_databases
    create_databases
    restore "$1"
    echo "stage: reset ($DB_COPY restored, $DB_FRESH empty)"
}

env_value() {
    sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r'
}

require_stage_db() {
    [ "$1" = "$DB_COPY" ] || [ "$1" = "$DB_FRESH" ] || fail "database '$1' is not a stage database ($DB_COPY, $DB_FRESH)"
}

cmd_migrate() {
    require_container
    [ -f "$ENV_FILE" ] || fail "missing $ENV_FILE; copy .env.stage.example to .env.stage"

    local db="${1:-$DB_COPY}"
    local host port
    host="$(env_value POSTGRES_HOST)"
    port="$(env_value POSTGRES_PORT)"

    # Production guards: stage host/port and stage database names only
    case "$host" in
        localhost | 127.0.0.1) ;;
        *) fail "$ENV_FILE POSTGRES_HOST is '$host'; stage must be localhost" ;;
    esac
    [ "$port" = "$PORT" ] || fail "$ENV_FILE POSTGRES_PORT is '$port'; stage must be $PORT"
    require_stage_db "$db"

    # .sequelizerc resolves paths from the working directory
    cd "$REPO_ROOT"

    # --env-file does not override inherited variables; strip them so only
    # .env.stage supplies connection values
    env -u POSTGRES_USER -u POSTGRES_PASSWORD -u POSTGRES_HOST -u POSTGRES_PORT \
        POSTGRES_DB="$db" \
        node --env-file="$ENV_FILE" node_modules/sequelize-cli/lib/sequelize db:migrate
}

cmd_psql() {
    require_container
    $(tty_prefix) docker exec -it "$CONTAINER" psql -U "$PG_USER" -d "${1:-$DB_COPY}"
}

cmd_sql() {
    require_container
    [ -n "${1:-}" ] || fail "missing <file> argument"
    [ -f "$1" ] || fail "sql file not found: $1"

    local db="${2:-$DB_COPY}"
    require_stage_db "$db"

    # stdin keeps multi-line SQL away from the terminal; -X skips psqlrc
    docker exec -i "$CONTAINER" psql -X -U "$PG_USER" -d "$db" -v ON_ERROR_STOP=1 < "$1"
}

# Stage scripts hard-code the stage connection; see the script headers
run_stage_script() {
    require_container

    # sql-logger writes ./logs relative to the working directory
    cd "$REPO_ROOT"
    npx tsx "deployment/stage/$1"
}

cmd_down() {
    require_container

    # down only interpolates the file; the image value is not used
    STAGE_PG_IMAGE="${STAGE_PG_IMAGE:-unused}" compose down -v

    # a container started outside compose (pre-compose stage.sh) is not removed by down
    if container_exists; then
        docker rm -fv "$CONTAINER" > /dev/null
    fi

    echo "stage: removed stage stack"
}

command="${1:-}"
shift || true

case "$command" in
    up) cmd_up "$@" ;;
    reset) cmd_reset "$@" ;;
    migrate) cmd_migrate "$@" ;;
    psql) cmd_psql "$@" ;;
    sql) cmd_sql "$@" ;;
    seed-fresh) run_stage_script seed-fresh.ts ;;
    check-responses) run_stage_script check-responses.ts ;;
    down) cmd_down ;;
    *) fail "usage: stage.sh {up <dump>|reset <dump>|migrate [db]|psql [db]|sql <file> [db]|seed-fresh|check-responses|down}" ;;
esac
