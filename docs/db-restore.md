# Database Restore Guide

Restores the Stream Assist Bot database in the `compose.yaml` stack (`postgres` service, database `stream-assist-bot`, user `postgres`) from a backup.

## Prerequisites

* Docker running and the `compose.yaml` stack up
* A backup in pg_dump custom format (`-Fc`)
* Run all commands from the repository root in bash

## Full Sequence

Each step is detailed in the sections below.

```bash
# 1. Stop the bot
docker compose stop app

# 2. Back up the current database
docker compose exec -T postgres pg_dump -U postgres -Fc stream-assist-bot > local-cache/pre-restore.dump

# 3. Drop and recreate the database
docker compose exec -T postgres dropdb -U postgres stream-assist-bot
docker compose exec -T postgres createdb -U postgres stream-assist-bot

# 4. Restore from the backup
docker compose exec -T postgres pg_restore -U postgres -d stream-assist-bot --no-owner < <backup>.dump

# 5. Verify the tables
docker compose exec postgres psql -U postgres -d stream-assist-bot -c '\dt'

# 6. Start the bot
docker compose start app
```

## 1. Stop the Application

```bash
docker compose stop app
```

Prevents writes during the restore and releases the bot's connections so the database can be dropped.

## 2. Back Up the Current Database

```bash
docker compose exec -T postgres pg_dump -U postgres -Fc stream-assist-bot > local-cache/pre-restore.dump
```

* `-Fc` (custom format) is what `pg_restore` reads
* `-T` disables the pseudo-TTY, which would corrupt the binary output
* `local-cache/` is gitignored

## 3. Drop and Recreate the Database

```bash
docker compose exec -T postgres dropdb -U postgres stream-assist-bot
docker compose exec -T postgres createdb -U postgres stream-assist-bot
```

## 4. Restore from the Backup

```bash
docker compose exec -T postgres pg_restore -U postgres -d stream-assist-bot --no-owner < <backup>.dump
```

`--no-owner` skips ownership commands, matching `deployment/stage/stage.sh`.

## 5. Verify the Restore

```bash
docker compose exec postgres psql -U postgres -d stream-assist-bot -c '\dt'
```

Lists the restored tables, including `SequelizeMeta` (applied migrations).

## 6. Restart the Application

```bash
docker compose start app
```

Check the bot log for `DB Connection has been established successfully.` and `DB Sync completed successfully`.

## Troubleshooting

* **`dropdb` fails with active connections**: the bot is still connected; confirm step 1 with `docker compose ps`
* **`pg_restore` rejects the file**: the backup is not custom format; recreate it with `pg_dump -Fc`

## Related

* [Stage Environment](stage-environment.md): rehearse against a restored copy before touching the live database
