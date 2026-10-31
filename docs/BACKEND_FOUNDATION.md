# Backend Foundation Setup

## Current implementation

The repository now contains a minimal Cloudflare Workers-compatible API entry point and three D1 schema migrations: core learner/account tables, followed by admin authentication metadata and bilingual dictionary moderation tables, then authentication rate-limit storage and lookup indexes.

Implemented:
- `GET /api/v1/health` returns a minimal service status.
- Unknown API routes return a generic JSON 404.
- CORS only reflects origins explicitly listed in `ALLOWED_ORIGINS`.
- Responses include no-store and basic security headers.
- Initial D1 tables cover users, learner profiles, OTP challenge metadata, sessions, saved words, lesson progress, quiz attempts, admin audit events, admin authentication metadata, dictionary moderation, and hashed-key rate-limit counters.
- Node regression tests cover the health route, generic routing, and CORS allowlisting.

Not implemented:
- No OTP generation, email delivery, or OTP verification.
- No password hashing, admin 2FA/TOTP, recovery codes, or session issuance.
- No authenticated learner/admin APIs or cloud progress sync.
- No database binding or production deployment.
- No secrets, domains, email provider, or paid services have been configured.

## Local API test

Use Node.js 20 or later:

```sh
node --test tests/*.test.js
```

## Cloudflare D1 preparation

1. Create a Cloudflare account and decide which account/project owns the deployment.
2. Create a D1 database named `lingua-academy-db`.
3. Add a `wrangler.toml` (or `wrangler.jsonc`) with a Worker entry pointing to `backend/src/index.js` and a D1 binding named `DB`.
4. Replace the database ID with the real ID returned by Cloudflare; never commit API tokens.
5. Apply migrations with Wrangler's D1 migration command.
6. Configure `ALLOWED_ORIGINS` as a Worker environment variable with the exact learner/admin web origins. Do not use wildcard origins with credentials.
7. Deploy only after reviewing the environment and security settings.

The repository intentionally does not contain a fake database ID or production credentials. The schema is a starting point. GitHub Actions now executes both migration files against Python's SQLite engine in an in-memory database and checks table creation, defaults, constraints, foreign keys, and dictionary relationships. This validates SQLite migration execution in CI; it does not replace testing against a real Cloudflare D1 database.

## Security gates before authentication

- OTP values must be short-lived, single-use, hashed at rest, attempt-limited, and never logged.
- Email sending must use a server-side provider adapter and secret storage.
- Admin password login must not issue a session until the required second factor succeeds.
- Admin accounts must be provisioned by a trusted process; public learner registration must never grant admin access.
- Session cookies/tokens must be random, hashed at rest, expiring, revocable, and configured for the client type.
- Every protected API route must enforce role and ownership checks on the server.
- Add rate limits, audit events, CSRF protection where cookie sessions are used, and security tests before enabling real accounts.

## Next implementation sequence

1. Confirm Cloudflare account and create D1 database.
2. Apply all three migrations to a staging D1 database and run D1-specific integration tests.
3. Configure an email delivery provider and secrets.
4. Implement learner email OTP with a provider adapter and enforce the rate-limit table atomically.
4. Implement secure session lifecycle and learner profile/progress APIs.
5. Implement admin provisioning, password + TOTP, passwordless admin email OTP, and server-side authorization.
6. Build the separate Admin Panel and dictionary publishing workflow.
