# The app

The Kivu Ferry booking app. What it does and why it's built this way: [app design](../docs/architecture/app.md) and the [decision records](../docs/adr/).

## Requirements

| Dependency | Version | How the app finds it |
|---|---|---|
| PostgreSQL | 18, the newest on AWS RDS | `DATABASE_URL` |
| pg_dump | 18, optional | Writes `schema.sql`: see [Database](#database) |
| Valkey | 9.1, the newest on AWS ElastiCache | `VALKEY_URL` |
| uv | 0.11 or later | installs Python 3.14 for the worker by itself |
| Node.js | 26 (LTS), pinned in each service's `.nvmrc` | `make` switches to it through nvm when nvm is installed |
| pnpm | 10 or later | switches itself to the version pinned in `package.json` (12.16) |
| make | any | runs every service's commands from the repository root (`make` lists them) |

Where PostgreSQL and Valkey run is up to you; the services only need their URLs. `make install` installs every service's dependencies.

A clean stop (SIGTERM) exits with status 143 in all three services: that's expected, not a failure.

## Database

Migrations in plain SQL, in `app/db/migrations/`. `app/db/schema.sql` is the resulting structure: commit it with each migration. Never edit either after it's merged.

```bash
cd app/db
cp .env.example .env        # then adjust
cd ../..
make db-migrate             # or make db-rollback
make db-new-migration name=add_passenger_name
make test-db
make check-db
```

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgres://kivu:kivu@localhost:5432/kivu?sslmode=disable` | The database to migrate |
| `TEST_DATABASE_URL` | `postgres://kivu:kivu@localhost:5432/kivu_test?sslmode=disable` | Tests create and drop their own databases from here, so its user must be allowed to |
| `PG_DUMP_COMMAND` | `pg_dump -h db.example` | Optional. The command that runs `pg_dump`, wherever PostgreSQL is |

| `pg_dump` | `make db-migrate` | `schema.sql` |
|---|---|---|
| Set in `PG_DUMP_COMMAND`, or on the `PATH` | Migrates | Updated |
| Not available | Migrates, with a note, and a loud warning if `schema.sql` misses a migration | Not updated, and its test is skipped |
| Fails | Migrates, then exits with status 1 and the cause | Not updated |

`pg_dump` must be at least as new as the server.

## Worker

Payments, tickets, sign-in codes and expiry. For now it only serves its internal port.

**Settings**, read from the environment and checked at startup:

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://kivu:kivu@localhost:5432/kivu` | PostgreSQL |
| `VALKEY_URL` | `redis://localhost:6379/0` | Valkey (it speaks the Redis protocol, hence `redis://`) |
| `INTERNAL_PORT` | `8001` | Health checks and version; never routed by the proxy |
| `LOG_LEVEL` | `info` | Optional, `info` by default: `debug`, `info`, `warn`, `error` or `silent` |
| `TEST_DATABASE_URL` | `postgresql://kivu:kivu@localhost:5432/kivu_test` | Tests only: a separate database |
| `TEST_VALKEY_URL` | `redis://localhost:6379/1` | Tests only: a separate Valkey database |

**Run it:**

```bash
cd app/worker
cp .env.example .env        # then adjust
uv run --env-file .env kivu-ferry-worker
```

| Endpoint | Answers |
|---|---|
| `GET /livez` | 200 while the process runs |
| `GET /readyz` | 200 when PostgreSQL and Valkey answer, 503 naming the ones that don't |
| `GET /version` | The running version |

**Check it**, from the repository root:

```bash
make test-worker            # tests, with app/worker/.env when it exists
make check-worker           # ruff, mypy, and import boundaries
```

Or inside `app/worker`, with uv directly:

```bash
uv run --env-file .env pytest
uv run ruff check . && uv run ruff format --check .
uv run mypy src tests
uv run lint-imports         # features are only used through their public API
```

## API

Search, bookings and accounts, under `/api`. For now it only serves its health checks and version.

**Settings**, read from the environment and checked at startup:

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://kivu:kivu@localhost:5432/kivu` | PostgreSQL |
| `VALKEY_URL` | `redis://localhost:6379/0` | Valkey |
| `PORT` | `3001` | The API's only port: the public API under `/api`, health checks and version at the root |
| `LOG_LEVEL` | `info` | Optional, `info` by default: `debug`, `info`, `warn`, `error` or `silent` |
| `TEST_DATABASE_URL` | `postgresql://kivu:kivu@localhost:5432/kivu_test` | Tests only: a separate database |
| `TEST_VALKEY_URL` | `redis://localhost:6379/1` | Tests only: a separate Valkey database |

**Run it:**

```bash
cd app/api
cp .env.example .env        # then adjust
nvm use && pnpm install && pnpm build
pnpm start                  # reads .env when it exists
```

| Endpoint | Answers |
|---|---|
| `GET /livez` | 200 while the process runs |
| `GET /readyz` | 200 when PostgreSQL and Valkey answer, 503 naming the ones that don't |
| `GET /version` | The running version |
| `/api/...` | The public API, the only part the proxy routes |

**Check it**, from the repository root:

```bash
make test-api               # builds the API, then runs the tests, with app/api/.env when it exists
make check-api              # types, oxlint, prettier, and import boundaries
```

Or inside `app/api`, with pnpm directly: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm boundaries`.

## Web app

The booking website and the operations area. For now it only serves a placeholder page, its health checks and version.

**Settings**, read from the environment or `.env` (the environment wins), and checked by `pnpm start` and `pnpm dev` before Next.js starts:

| Variable | Example | Purpose |
|---|---|---|
| `API_URL` | `http://localhost:3001` | Where the web server finds the API, read at runtime so one build runs everywhere |
| `PORT` | `3000` | Optional, 3000 by default |
| `LOG_LEVEL` | `info` | Optional, `info` by default: `debug`, `info`, `warn`, `error` or `silent` |

**Run it:**

```bash
cd app/web
cp .env.example .env        # then adjust
nvm use && pnpm install && pnpm build
pnpm start                  # reads .env when it exists
```

| Endpoint | Answers |
|---|---|
| `GET /livez` | 200 while the process runs |
| `GET /readyz` | 200 while the process runs; it doesn't check the API, so an API outage doesn't take the website offline |
| `GET /version` | The running version |
| `/api/...` | Forwarded to the API at `API_URL` |

**Check it**, from the repository root:

```bash
make test-web               # builds the web app, then runs the tests; needs nothing else running
make check-web              # types, eslint, prettier, and import boundaries
```

Or inside `app/web`, with pnpm directly: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm boundaries`.
