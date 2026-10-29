# The app

The Kivu Ferry booking app. What it does and why it's built this way: [app design](../docs/architecture/app.md) and the [decision records](../docs/adr/).

## Requirements

| Dependency | Version | How the app finds it |
|---|---|---|
| PostgreSQL | 18, the newest on AWS RDS | `DATABASE_URL` |
| Valkey | 9.1, the newest on AWS ElastiCache | `VALKEY_URL` |
| uv | 0.11 or later | installs Python 3.14 for the worker by itself |

Where PostgreSQL and Valkey run is up to you; the services only need their URLs.

## Worker

Payments, tickets, sign-in codes and expiry. For now it only serves its internal port.

**Settings**, read from the environment and checked at startup:

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://kivu:kivu@localhost:5432/kivu` | PostgreSQL |
| `VALKEY_URL` | `redis://localhost:6379/0` | Valkey (it speaks the Redis protocol, hence `redis://`) |
| `INTERNAL_PORT` | `8001` | Health checks and version; never routed by the proxy |
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

On SIGTERM or Ctrl+C, it finishes in-flight requests, logs `worker stopped`, then exits with status 143.

**Check it:**

```bash
uv run --env-file .env pytest
uv run ruff check . && uv run ruff format --check .
uv run mypy src tests
uv run lint-imports         # features are only used through their public API
```
