# ADR-0003: Use the MTN MoMo sandbox for payments and the Africa's Talking sandbox for SMS in staging

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-28 |
| **Chapter** | 07 (staging), 16 (provider alerts) |

## Context

The app depends on two outside services: a mobile money provider for payments and an SMS provider for tickets and sign-in codes. No real money or SMS is involved anywhere in this lab.

- On a laptop and in CI, both are built-in simulators.
- In staging, the app should talk to real providers' free sandboxes, so the first time it meets a real API isn't in production.

Payments use the MTN MoMo developer sandbox. For SMS, using MTN as well looked attractive: one brand for both.

What staging needs from the SMS sandbox:

- a way to **see** that a message was delivered, since the end-to-end test checks it
- delivery callbacks to a public HTTPS URL
- a way to make sends fail, to test alerts

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **MTN SMS API** (developers.mtn.com) | Same brand as MoMo; Rwanda covered; its API defines delivery-report callbacks | The sandbox "only uses dummy data": no inbox or simulator to see a message; no public report of sandbox callbacks firing; keys only after an app approval step; no official SDK; a different portal, account and sign-in method from MoMo, so "one vendor" saves nothing |
| **Africa's Talking sandbox** | Free and self-serve; messages show up in a browser phone simulator; delivery and inbound callbacks to your own URL; a free failure case (simulator phone logged out); official Python and Node SDKs, updated in 2026 | A second vendor; callbacks aren't signed, so the callback URL needs its own secret |

## Decision

- **Payments:** MTN MoMo developer sandbox.
- **SMS:** Africa's Talking sandbox.
- Each provider sits behind an adapter chosen by an environment variable (`PAYMENT_PROVIDER`, `SMS_PROVIDER`), so either can be swapped without a code change.

## Consequences

**Positive:**
- The staging end-to-end test can confirm that an SMS ticket was delivered, through the delivery callback and the simulator.
- Real callbacks to practise with on both sides: MoMo for payments, Africa's Talking for SMS delivery.
- Provider failures can be triggered for chapter 16's alerts.

**Negative / accepted trade-offs:**
- Two vendor accounts and two sets of sandbox keys to keep per environment.
- Timeouts can't be triggered in either sandbox; they're injected through the simulator or the adapter.

**Revisit if:**
- MTN's SMS sandbox turns out to show delivered messages or fire delivery callbacks. One test call would settle it.
- The app ever sends real SMS in a specific country, which would make coverage the deciding factor.
