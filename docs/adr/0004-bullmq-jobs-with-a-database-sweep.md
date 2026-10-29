# ADR-0004: Use BullMQ in both services for jobs, with a database sweep as the backstop

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-29 |
| **Chapter** | The app (before chapter 02) |

## Context

The API (NestJS, TypeScript) hands slow or unreliable work to the worker (FastAPI, Python) through Redis: requesting payments and sending sign-in codes. The worker also queues work for itself, like sending a ticket once a payment is confirmed.

- Jobs are produced in Node and consumed in Python, so both sides must agree on the job format.
- Failed jobs must be retried with a delay.
- Redis holds nothing that can't be lost ([app design](../architecture/app.md)), so losing a job must never lose work.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **BullMQ** (Node and Python) | Official libraries for both languages from the same maintainers; same job format in Redis; retries, backoff and delayed jobs | The Python library has fewer features than the Node one |
| **Celery** | Mature and Python-native | Node producers are poorly supported; its own message format |
| **Redis Streams, by hand** | No library; full control | Retries, backoff and failed jobs written and tested by hand |

## Decision

- **BullMQ** in the API and the worker.
- **Payloads carry IDs, never copies of rows**, plus a `version` field. Fields are only ever added.
- **Each payload is defined once**, as a Pydantic model in the worker. A committed JSON Schema (`model_json_schema()`) generates the API's TypeScript types with json-schema-to-typescript. Queue and job names come from the same file. The worker validates every payload it receives.
- **A sweep in the worker runs about every 30 seconds** over the database:
  - it expires overdue unpaid bookings, after asking the provider for the payment status;
  - it re-queues work the database says is still due, like a ticket not yet sent.
- **Booking expiry is not a delayed job:** a lost job would hold a seat forever.

## Consequences

**Positive:**
- Losing Redis delays work but never loses it; the database stays the source of truth.
- A payload mismatch between the API and the worker is a build error, not a booking stuck until it expires.

**Negative / accepted trade-offs:**
- The worker only uses BullMQ features that both libraries support.
- Recovery after a lost job takes up to one sweep, and the sweep puts a small steady load on the database. Its indexes come with chapter 02.

**Revisit if:**
- The worker needs a BullMQ feature the Python library lacks.
- The sweep's queries get expensive at real volumes (chapter 02).
