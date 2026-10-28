# ADR-0001: Record architecture decisions

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-28 |
| **Chapter** | All |

## Context

These chapters involve many tool and design choices (Jenkins vs GitHub Actions, Caddy vs Traefik, Argo CD vs Flux, etc.). Without a record, the reasoning is lost, and the repo shows *what* was built but not *why*. The "why" is what matters in real teams.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| No formal record | Zero overhead | Reasoning lost; repo looks like copied tutorials |
| Notes in lab reports only | Low overhead | Decisions buried; hard to find or supersede |
| Lightweight ADRs in `docs/adr/` | Searchable, immutable history, industry practice | Small writing overhead per decision |

## Decision

We will use **lightweight ADRs** (Michael Nygard format, adapted) in `docs/adr/`, numbered sequentially, using [`_template.md`](_template.md).

## Consequences

**Positive:**
- Every significant choice is traceable and linkable from lab reports.
- Changing a decision is explicit (a new ADR supersedes the old one).

**Negative / accepted trade-offs:**
- ~15 minutes per decision.

**Revisit if:**
- ADRs start being written for trivial choices (then raise the bar, don't drop the practice).
