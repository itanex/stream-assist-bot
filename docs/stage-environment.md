# Stage Environment

`deployment/stage/` is a disposable Postgres stack for rehearsing database work before it reaches production. This guide covers verifying `sync()` + `seed()` against a fresh database. The full command list is in the header of `deployment/stage/stage.sh`.

## Prerequisites

* Docker running
* The `compose.yaml` stack up (the dump is taken from its `postgres` service)
* Run all commands from the repository root in bash

## Full Sequence

Each step is detailed in the sections below.

```bash
# 1. Create a dump from the compose.yaml postgres service
docker compose exec -T postgres pg_dump -U postgres -Fc stream-assist-bot > local-cache/stream-assist-bot.dump

# 2. Start stage: restores the dump, creates an empty fresh database
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh up local-cache/stream-assist-bot.dump

# 3. Run sync() + seed() against the fresh database; check the "seed result" line
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh seed-fresh

# 4. Tear down stage
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh down

# 5. Remove the dump
rm local-cache/stream-assist-bot.dump
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

## 3. Seed the Fresh Database

```bash
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh seed-fresh
```

Runs the app's `sync()` and `seed()` against `stream-assist-bot-stage-fresh` without starting the bot. Check the result line:

```
info: == seed result: <n> CommandResponse, <n> CommandResponseText (0 means seed() failed; see error above)
```

* Non-zero counts and no `Failed to Seed Data` error: seeding succeeded
* Zero counts: `seed()` failed; the error is logged above the result line

## 4. Tear Down

```bash
STAGE_PG_IMAGE=postgres:17.2 bash deployment/stage/stage.sh down
```

Removes the stage container, network, and anonymous volumes.
