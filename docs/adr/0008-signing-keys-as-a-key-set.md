# ADR-0008: Load token signing keys as a key set from an environment variable

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-29 |
| **Chapter** | The app; 08 (secrets manager), 10 (replicas) |

## Context

Access tokens are JWTs that the API signs, then checks on every request without a database lookup (O7). Whoever holds the signing key can issue a token for anyone, so the key must be replaceable: after a leak, and routinely (SEC4).

- **Replacing a single key invalidates every access token at once:** requests in flight fail, and every active client gets a new token at the same moment.
- **From chapter 10, several API replicas run side by side,** and a deploy updates them one at a time. Replicas on the new key would reject tokens signed by replicas still on the old one, and the reverse.

Services are configured only through environment variables (O1), and there is no secrets manager before chapter 08.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| One key in an environment variable | Simplest | Rotating it invalidates every access token at once, and replicas disagree during a deploy |
| **A key set in an environment variable** | Rotation with no failed request; a standard format (JWKS) | Three deploys per rotation |
| AWS Secrets Manager | Proper storage, access audit, managed rotation | Not available before chapter 08 |

## Decision

- **`TOKEN_SIGNING_KEYS` holds a JSON key set.** Each key has an ID (`kid`), and every key in the set verifies.
- **`TOKEN_SIGNING_KEY_ID` names the key that signs.**
- **Rotation takes three deploys:**
  1. add the new key to the set, so every replica accepts it;
  2. point `TOKEN_SIGNING_KEY_ID` at it; tokens signed with the old key still verify;
  3. 15 minutes later, once those tokens have expired, remove the old key.
- **Refresh tokens aren't signed** (they're random and stored hashed), so rotation never touches them.
- **From chapter 08,** the variables' values come from AWS Secrets Manager. The app keeps reading the same variables.

## Consequences

**Positive:**
- No request fails during a rotation, even in the middle of a deploy.
- After a leak, the old key can be removed at once: tokens it signed are rejected, and clients get new ones with their refresh tokens.

**Negative / accepted trade-offs:**
- A routine rotation takes three deploys instead of one.
- Until chapter 08, keys live in environment files, which must never be committed. `.gitignore` already excludes them.

**Revisit if:**
- Keys need to rotate faster than a deploy allows.
