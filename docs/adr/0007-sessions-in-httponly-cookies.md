# ADR-0007: Keep sessions in httpOnly cookies, with short access tokens and revocable refresh tokens

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-29 |
| **Chapter** | The app; 18 (native clients) |

## Context

Travellers sign in with a phone number and a code (F9), staff with email, password and a second factor (F14). Access tokens last 15 minutes, refresh tokens are stored hashed and can be revoked (SEC3), and staff passwords use a slow hash (SEC5). Services are stateless (O7). The web app and the API share one domain behind the proxy: `/` and `/api`.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **httpOnly cookies, one domain** | Page scripts can't read the tokens; no CORS; works with server-side rendering | Needs CSRF protection; native apps need another way |
| Tokens in browser storage, sent in a header | Same mechanism for web and native apps | Any script injected into the page can read them |
| Server-side sessions only | Instant revocation | A database or Valkey lookup on every request |

## Decision

- **Access token:** a JWT that lasts 15 minutes, signed as in [ADR-0008](0008-signing-keys-as-a-key-set.md).
- **Refresh token:** random, stored hashed in the `session` table, revocable per device or everywhere (F12).
- **Both live in httpOnly, Secure, SameSite cookies.** Requests that change data also check the `Origin` header, against CSRF.
- **Locally, until the proxy arrives in chapter 04,** Next.js forwards `/api` to the API, so it's still one domain.
- **Libraries:** `jose` for tokens, `@node-rs/argon2` (Argon2id) for staff passwords, `otpauth` for the second factor.

## Consequences

**Positive:**
- Tokens are out of reach of page scripts.
- Signing out everywhere means revoking refresh tokens.

**Negative / accepted trade-offs:**
- A revoked session keeps working until its access token expires, at most 15 minutes.
- The mobile and desktop apps (chapters 18–19) will send tokens in a header instead: a small API change, made in chapter 18.

**Revisit if:**
- Up to 15 minutes before a revocation takes effect becomes unacceptable.
