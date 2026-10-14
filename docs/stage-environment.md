# Stage Environment

`deployment/stage/` is a disposable Postgres stack for rehearsing database work before it reaches production. This guide covers running the migrations against a fresh database and a restored copy, then verifying the baseline seed data. The full command list is in the header of `deployment/stage/stage.sh`.

## Prerequisites

* Docker running
* The `compose.yaml` stack up (the dump is taken from its `postgres` service)
* `deployment/stage/.env.stage` present (copy `.env.stage.example`)
* Run all commands from the repository root in bash

## Full Sequence

Each step is detailed in the sections below.

```bash
# 1. Create a dump from the compose.yaml postgres service
docker compose exec -T postgres pg_dump -U postgres -Fc stream-assist-bot > local-cache/stream-assist-bot.dump

# 2. Start stage: restores the dump, creates an empty fresh database
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh up local-cache/stream-assist-bot.dump

# 3. Run the migrations against the fresh database and the restored copy
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh migrate stream-assist-bot-stage-fresh
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh migrate

# 4. Verify the baseline seed data in both databases
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh check-responses stream-assist-bot-stage-fresh
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh check-responses

# 5. Tear down stage, remove the dump, confirm no stage container remains
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh down
rm local-cache/stream-assist-bot.dump
docker ps -a --filter name=sab-stage
```

## 1. Create a Dump

`stage.sh up` requires a dump, even when only the fresh database is used.

```bash
docker compose exec -T postgres pg_dump -U postgres -Fc stream-assist-bot > local-cache/stream-assist-bot.dump
```

* `-Fc` (custom format) is required; `stage.sh` restores with `pg_restore`, which rejects plain SQL dumps
* `-T` disables the pseudo-TTY, which would corrupt the binary output
* No password is needed: `pg_dump` connects over the container's local socket
* `local-cache/` is gitignored; delete the dump when finished

## 2. Start Stage

```bash
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh up local-cache/stream-assist-bot.dump
```

`STAGE_PG_IMAGE` must match or exceed production's Postgres major version. On success:

```
stage: up on localhost:6433 (stream-assist-bot-stage restored, stream-assist-bot-stage-fresh empty)
```

## 3. Run the Migrations

```bash
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh migrate stream-assist-bot-stage-fresh
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh migrate
```

* Fresh database: every migration runs, building the schema and inserting the baseline seed data
* Restored copy (the default): only migrations newer than production's `SequelizeMeta` run, as they would on deploy

## 4. Verify the Seed Data

```bash
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh check-responses stream-assist-bot-stage-fresh
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh check-responses
```

Checks every command/variant pair in the baseline seed migration against the database, without loading bot code. The last line is the verdict, and the exit code matches it (0 on `PASS`, 1 on `FAIL`):

```
== PASS <database>: <n>/<n> seed pairs present with text, <n> missing texts
== FAIL <database>: <n>/<n> seed pairs present with text, <n> missing texts
```

* `missing pair`: the pair has no row, or no active text; the check fails
* `missing text`: a baseline text is absent; reported only, since a restored copy may have texts edited or removed in chat
* `FAIL check-responses could not complete`: the check did not run (e.g. stage not up); the error follows

## 5. Tear Down

```bash
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh down
rm local-cache/stream-assist-bot.dump
docker ps -a --filter name=sab-stage
```

Removes the stage container, network, and anonymous volumes, and the dump. The pass is complete only when `docker ps -a` lists no `sab-stage` container.
