# ADR-0002: Self-host the Next.js frontend instead of using Vercel

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-28 |
| **Chapter** | All chapters that deploy the app |

## Context

The frontend is a Next.js app. Vercel, the company behind Next.js, is the most common way to run it: push to Git and it's deployed, with a CDN, preview environments and scaling included. Many production teams use it.

This repo is a DevOps lab. Its goal is to show and practise running a full-stack system in production, not only the backend.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **Vercel** | No operations work; CDN, previews and scaling built in; best support for Next.js features | Hides exactly the work this lab is about; a second platform outside the rest of the infrastructure; cost grows with traffic |
| **Static export on a CDN** (S3 + CloudFront) | Cheap and simple to host | Gives up server-side rendering; not how most Next.js apps run |
| **Self-hosted, next to the other services** | The frontend goes through every stage like the API: image, pipeline, Kubernetes, monitoring | More work: runtime configuration, a shared cache across replicas, static files on a CDN, zero-downtime deploys |

## Decision

We self-host the frontend with the rest of the system: its own container image, deployed by the same pipeline, running next to the API and the worker, with its static files served from a CDN.

**This is a deliberate choice for learning.** For a real product with a small team, Vercel would often be the better choice.

## Consequences

**Positive:**
- The lab covers the full stack, not only the backend.
- One way to build, deploy, secure and monitor every service.
- The problems of self-hosting Next.js become part of the lab:
  - `NEXT_PUBLIC_` variables are fixed at build time, but one image must run in every environment.
  - Each replica keeps its own cache unless it's shared.
  - During a rollout, pages from the old version must still find their static files.

**Negative / accepted trade-offs:**
- More to build and run than a one-click deploy.
- No preview environment per pull request unless built separately.

**Revisit if:**
- The goal changes from learning to running a real product with a small team.
