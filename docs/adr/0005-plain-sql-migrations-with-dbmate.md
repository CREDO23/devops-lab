# ADR-0005: Write migrations in plain SQL with dbmate

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-29 |
| **Chapter** | The app; 02 (safe schema changes) |

## Context

Two services in two languages write to one PostgreSQL database. Schema changes must be versioned and applied separately from app startup (O6). Chapter 02 works on changing the schema safely, so the migrations must be easy to read and reason about.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **dbmate** | One binary, independent of either language; plain SQL; dumps the full schema to `schema.sql` | SQL written by hand, including rollbacks |
| **Prisma or TypeORM migrations** | Generated from models | The API would own a schema the worker also writes to |
| **Alembic** | Mature; generates migrations from models | The worker would own the schema |
| **Flyway** | Mature; plain SQL | Needs a Java runtime |

## Decision

- **dbmate**, with migrations in `app/db/migrations/` and `app/db/schema.sql` committed after every migration.
- **Migrations run as their own command, never at app start.** Several replicas starting at once would race to migrate.
- **dbmate's version is pinned, and `pg_dump` matches the server's version**, so `schema.sql` only changes when the schema does.
- **`PG_DUMP_COMMAND` says how to run `pg_dump`,** so the repo doesn't care where PostgreSQL runs. Without `pg_dump`, migrations still run and `schema.sql` isn't updated; when it fails, the error is reported, since dbmate alone ignores it.

## Consequences

**Positive:**
- Neither service owns the schema; both generate their types from it ([ADR-0006](0006-query-the-database-with-generated-types.md)).
- Chapter 02's safe changes work on plain SQL anyone can read.

**Negative / accepted trade-offs:**
- Every rollback (`-- migrate:down`) is written by hand.
- A `pg_dump` that doesn't match the server's version rewrites `schema.sql` for no reason.
- `schema.sql` can go stale on a machine with no `pg_dump`. Migrating there warns loudly without failing, and the check in chapter 07's pipeline will catch it.

**Revisit if:**
- A tool built for zero-downtime changes, like pgroll, would make chapter 02's expand/contract steps safer.
