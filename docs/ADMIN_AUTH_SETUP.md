# Administrator authentication setup

## Admin console

The separate console is published at:

`https://sparkles-systems-solutions.github.io/lingua-ai-english-academy/admin/`

It supports two server-verified methods:
- Password + authenticator-app TOTP
- Email OTP

The console is only a client. Authorization is enforced by the Worker and every admin API request must carry an active session whose user role is `admin`.

## Required Cloudflare Worker secrets

In Cloudflare Dashboard → Workers & Pages → lingua-academy-api → Settings → Variables and Secrets, configure these as Secrets:

- `OTP_PEPPER` (already required by learner OTP; at least 32 random characters)
- `SESSION_PEPPER` (already required by learner sessions; different from OTP_PEPPER)
- `RESEND_API_KEY` and `EMAIL_FROM` (verified Resend sender; already required for email OTP)
- `TOTP_ENCRYPTION_KEY`: base64 encoding of exactly 32 cryptographically random bytes. Use a different key from all other secrets.

Never commit or paste secret values into GitHub source, chat, screenshots, or browser storage.

## Password hash format

Admin passwords are verified with PBKDF2-HMAC-SHA256, 256-bit output, and at least 210,000 iterations. The database format is:

`PBKDF2-SHA256$210000$<base64-salt>$<base64-derived-key>`

Use a cryptographically random salt of at least 16 bytes. The Worker rejects weaker iteration counts. Do not store a plaintext password.

## TOTP enrollment storage format

Use an authenticator app and a unique Base32 secret per administrator. Encrypt the UTF-8 Base32 secret with AES-256-GCM using the Worker `TOTP_ENCRYPTION_KEY`. Use a fresh random 12-byte IV for every encryption. Store `base64(iv).base64(ciphertext_and_tag)` in `admin_mfa_factors.secret_ciphertext`. Mark the factor `verified_at` only after the administrator successfully confirms a code from the authenticator app. Do not store the raw TOTP secret.

The Worker accepts standard 6-digit TOTP (30-second period, SHA-1) with a one-step clock-drift window.

## Provision the first administrator

There is intentionally no public admin registration or self-promotion endpoint. Create the first admin through a trusted, authenticated D1 administrative session only after preparing the password hash and encrypted TOTP secret. The user row must have `role='admin'` and `status='active'`; create matching rows in `admin_credentials`, `admin_auth_policies`, and `admin_mfa_factors`. Set `allowed_methods_json` to `["password_totp","email_otp"]` and `require_totp=1`. Record the provisioning in `admin_audit_events`. Never use the public learner OTP endpoint to grant an admin role.

Do not run the repository's historical migrations against the live database; these tables already exist in the configured D1 database. Provisioning should be performed by an authorized database operator after verifying the intended admin email out of band.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/v1/admin/auth/password-totp` | Verify password and TOTP; issue admin session |
| POST | `/api/v1/admin/auth/otp/request` | Request admin email OTP |
| POST | `/api/v1/admin/auth/otp/verify` | Verify one-use OTP; issue admin session |
| GET | `/api/v1/admin/me` | Validate current admin session |
| POST | `/api/v1/admin/mfa/totp/setup` | Create encrypted pending TOTP enrollment for the signed-in admin |
| POST | `/api/v1/admin/mfa/totp/verify` | Verify authenticator code and activate the factor |

OTP expires after 10 minutes, is stored as an HMAC digest, and is single-use. Authentication attempts use the persistent `admin_auth` rate-limit bucket. Successful logins are recorded in `admin_audit_events`.

## Current implementation boundary

This increment delivers the separate sign-in console and role-protected authentication/identity endpoints. Dictionary content management, learner administration, audit-log browsing, admin password reset, TOTP recovery UI, dictionary/learner management, and full production UAT remain subsequent work. Do not treat an admin login as fully production-ready until secrets are configured, the first administrator is provisioned securely, and both sign-in methods are tested against the live Worker.


## Offline credential preparation helper

A browser-only helper is provided at `tools/admin-provisioning-offline.html`. Download the file from the repository to a trusted computer and open the downloaded file locally. For the strongest isolation, disconnect from the network before entering credentials. The page uses the browser Web Crypto API and contains no fetch/XHR/network calls; it generates a PBKDF2-SHA256 password hash, a random TOTP secret, an AES-256-GCM encrypted TOTP value, a fresh encryption key, and a D1 provisioning SQL script. Nothing is uploaded by the helper.

1. Generate the values locally. Do not share screenshots or copy the secrets into chat, issues, or source code.
2. Add the generated encryption key as the Worker Secret `TOTP_ENCRYPTION_KEY` before running the SQL.
3. Verify that the target email does not already exist in `users`, and verify the selected D1 database is `lingua-academy-db`. The generated SQL is an initial-account insert, not an account migration; do not run it if the email already exists.
4. Review and run the SQL once in the intended D1 database. Keep the encryption key and TOTP secret in an approved password manager.
5. The generated factor is deliberately unverified. The current Admin UI does not yet include a TOTP enrollment/confirmation screen. Email OTP can be used if the Resend secrets and sender are configured; Password + TOTP must remain unavailable until a secure enrollment confirmation flow has been implemented and a real authenticator code has been verified. Never manually set `verified_at` just to bypass enrollment.

The helper is a convenience for preparing credentials only. It does not configure Cloudflare secrets, execute D1 SQL, send email, or activate an administrator. Review generated SQL before execution.
