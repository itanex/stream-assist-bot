# Production Database

`deployment/production/database.sh` manages the `compose.yaml` database across deploys. The app no longer builds its schema at boot; every schema change is a sequelize-cli migration, and every change to the database is preceded by a dump. The full command list is in the script header.

## Prerequisites

* Docker running
* The `compose.yaml` `postgres` service up (`docker compose up -d postgres`)
* `IMAGE_TAG` set to the app version being deployed (`migrate` and `fresh`); migrations run from that image, not the working tree
* Run all commands from the repository root in bash

## Choosing a Path

| Deploy | Command |
|---|---|
| New app version, no new migrations | `IMAGE_TAG=<version> docker compose up -d` (no tool needed) |
| New app version with migrations, existing database | `migrate` |
| New database (new Postgres version, new volume, first install) | `fresh` |

## Backup

```bash
bash deployment/production/database.sh backup
```

* Writes `backups/<database>-<UTC timestamp>.dump` in custom format (`-Fc`), readable by `pg_restore`
* The database name is read from the `postgres` container's environment
* `backups/` is gitignored

## Migrate

```bash
IMAGE_TAG=<version> bash deployment/production/database.sh migrate
IMAGE_TAG=<version> bash deployment/production/database.sh migrate --dump <file>
```

1. Stops `app`, so nothing writes between the dump and the migration
2. Takes a dump with `backup`, or uses `<file>` with `--dump`. A supplied dump must be new for this change; the tool only checks that `pg_restore` can read it
3. Runs `db:migrate` in a one-off `app` container from `IMAGE_TAG`. Only migrations missing from `SequelizeMeta` run

`migrate` always dumps, even when no migrations are pending. It leaves `app` stopped; start it with `IMAGE_TAG=<version> docker compose up -d`.

## Fresh

```bash
IMAGE_TAG=<version> bash deployment/production/database.sh fresh [dump]
```

* Refuses to run unless the database has no tables in `public`
* With a dump: restores it in a single transaction, then runs `db:migrate`. Only migrations newer than the dump's `SequelizeMeta` run
* Without a dump: runs every migration, building the schema and the baseline seed data (first install)
* A dump on a first install loads preset content beyond the baseline

`fresh` leaves `app` stopped; start it with `IMAGE_TAG=<version> docker compose up -d`.

### New Postgres Version

1. `bash deployment/production/database.sh backup` on the current stack
2. Stop the stack and replace the `postgres` image and the `stream-assist-bot-database` volume
3. `docker compose up -d postgres`
4. `IMAGE_TAG=<version> bash deployment/production/database.sh fresh <dump from step 1>`

The new Postgres major must match or exceed the one that produced the dump.

## Failure Recovery

* `migrate` fails: `app` stays stopped and the restore point is printed. Recreate the database (see [Database Restore Guide - Drop and Recreate](db-restore.md#3-drop-and-recreate-the-database), or replace the volume), then `fresh <restore point>` with the previous `IMAGE_TAG`
* `fresh` restore fails: the restore runs in one transaction, so the database is left empty
* `fresh` migration fails after a restore: the database holds the restored data, unmigrated. Recreate it as above and run `fresh` again once the migration is fixed

Rehearse migrations against a production dump with [Stage Environment](stage-environment.md) before running `migrate`.
