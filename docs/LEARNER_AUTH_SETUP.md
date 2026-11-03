# Learner Authentication and Cloud Sync — Deployment Setup

## Implemented API routes

All routes are versioned under `/api/v1`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/learner/otp/request` | Request a six-digit learner email code |
| POST | `/auth/learner/otp/verify` | Verify code and issue a bearer session |
| GET | `/learner/me` | Read authenticated learner and profile |
| PUT | `/learner/profile` | Update display name and daily target |
| POST | `/learner/progress/sync` | Sync lesson progress and saved dictionary IDs |
| POST | `/auth/logout` | Revoke the current session |
| GET | `/health` | Worker health |
| GET | `/health/database` | D1 connectivity and application table count |

## Required Worker secrets

Configure these in Cloudflare Dashboard → Workers & Pages → lingua-academy-api → Settings → Variables and Secrets. Add them as **Secrets**, not plain-text variables:

- `RESEND_API_KEY`: API key created in Resend.
- `EMAIL_FROM`: verified sender, for example `Lingua Academy <login@your-verified-domain.example>`.
- `OTP_PEPPER`: cryptographically random secret of at least 32 characters.
- `SESSION_PEPPER`: a separate cryptographically random secret of at least 32 characters.

Never put these values in GitHub source files, browser JavaScript, screenshots, or chat messages. Do not reuse one pepper for both purposes.

## Resend prerequisites

1. Create or sign in to a Resend account.
2. Verify a sending domain and configure the required DNS records.
3. Create an API key with permission to send email.
4. Add the API key and verified sender address to the Worker secrets above.
5. Test with an email address permitted by the Resend account's current sending/domain verification state.

If email credentials are absent or delivery fails, the API returns a service-unavailable response; it does not issue a fake OTP or pretend an email was sent.

## Existing database

The implementation uses the existing `users`, `learner_profiles`, `otp_challenges`, `sessions`, `auth_rate_limits`, `lesson_progress`, and `learner_saved_words` tables. It does not require a new migration. Do not rerun the initial migrations against the existing production database.

## Security behaviour

- Email addresses are normalized before use.
- OTPs are generated using Web Crypto and stored as keyed HMAC digests, not plaintext.
- OTPs expire after 10 minutes and can be consumed only once.
- Verification attempts and OTP requests are rate-limited using keyed-hash buckets.
- Session tokens are random bearer tokens; only their HMAC hashes are stored in D1.
- Sessions expire after 30 days and can be revoked by logout.
- Public learner registration can only create/use the learner role; it cannot promote an account to admin.
- Progress writes are scoped to the authenticated user.
- CORS is limited to the configured Pages origin.

## Important implementation boundary

This commit implements the learner authentication/profile/progress API foundation. It does **not** yet complete the separate Admin Panel, administrator password + TOTP flow, administrator Email OTP flow, dictionary publishing/search APIs, frontend learner sign-in integration, or browser-local progress migration UI. These remain required Phase 2 work and must be tested before calling Phase 2 complete.

The current static learner app still works locally and stores its existing progress in that browser. Do not clear browser storage while cloud migration is being built.
