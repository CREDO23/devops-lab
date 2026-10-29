# ADR-0009: Use Valkey instead of Redis

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-30 |
| **Chapter** | The app; 08 (ElastiCache) |

## Context

The system needs an in-memory store for the job queue ([ADR-0004](0004-bullmq-jobs-with-a-database-sweep.md)), rate-limit counters and sign-in codes. Redis is the usual choice. Valkey is an alternative that [speaks the same protocol](https://valkey.io/topics/protocol/) (RESP) and includes [every Redis 7.2 feature](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html); since then, each adds commands of its own.

Chapter 08 runs this store on AWS ElastiCache, which offers Valkey up to 9.1 but [stops at Redis 7.1](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **Valkey** | Offered by ElastiCache, [priced 20% lower than Redis on nodes and 33% lower serverless](https://aws.amazon.com/elasticache/pricing/); the Redis protocol and every Redis 7.2 feature | Less widely known |
| Redis 8 | The best-known name | Not offered by ElastiCache, so local and AWS would differ |
| Redis 7.1 | Offered by ElastiCache | An old version, kept only for compatibility |

## Decision

- **Valkey** everywhere: on the laptop, in staging and on AWS. Its URL is `VALKEY_URL`.
- **Client libraries keep their Redis names** (ioredis, used by BullMQ, and redis-py): Valkey speaks the same protocol.
- The exact version is the newest one ElastiCache offers (9.1 today), pinned in `app/README.md`.

## Consequences

**Positive:**
- Local, staging and AWS run the same software.
- BullMQ, rate limits and expiring codes only use commands that existed in Redis 7.2, so nothing in the app depends on the choice.

**Negative / accepted trade-offs:**
- Docs and examples found online mostly say Redis; they apply, but the names differ.

**Revisit if:**
- ElastiCache offers Redis 8, or the app needs a command only Redis has.
