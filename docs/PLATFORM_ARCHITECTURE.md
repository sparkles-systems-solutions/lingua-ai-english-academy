# Platform Architecture — Lingua AI English Academy

## Goals
Deliver three connected products: a learner web application, a separate administrator web application, and an Android APK. All clients use one secured backend and one learner identity so progress follows the learner across devices.

## Logical components

```text
Learner Web App ─────┐
                     ├── HTTPS API ── Authentication / OTP service
Android APK ─────────┤             ├── Learner & progress services
                     │             ├── Curriculum / quiz services
Admin Web App ───────┘             ├── AI tutor gateway
                                   ├── Admin / reporting services
                                   └── Email delivery adapter
                                          │
                                   Relational Database
```

## Applications
- **Learner Web:** responsive student dashboard, lessons, vocabulary, quizzes, AI teacher, speaking/listening, writing, reading, progress and profile.
- **Admin Panel:** separately deployed application and route; admin dashboard, learner management, curriculum/content editor, quiz management, usage reports, system settings, audit log.
- **Android:** Capacitor-based wrapper is the proposed first APK approach. It loads the learner application and uses the same HTTPS API and account. Native microphone/audio permissions are requested only when needed.

## Backend responsibilities
- Authentication: learner email OTP, administrator password and/or OTP sign-in, second-factor verification, session lifecycle, logout and revocation.
- Authorization: learner/admin roles enforced on every protected API route; admin permissions and elevated actions checked server-side.
- Learner: profile, preferences, daily target and account state.
- Curriculum: units, lessons, translations, examples, activities, quizzes and versioning.
- Learning: attempts, answers, completion, vocabulary mastery, skill evidence, review queue.
- AI gateway: validate requests, apply limits, call configured model provider, return structured tutor feedback.
- Administration: account actions, content publishing, reports, settings and audit events.
- Synchronisation: authoritative server records, idempotent writes, updated timestamps and conflict-safe merge.

## Authentication policy

### Learner accounts
- Learners register and sign in using email OTP without a password.
- OTPs are short-lived, single-use, rate-limited and verified server-side.
- Successful verification creates a learner session.

### Administrator accounts — both methods supported
The separate Admin Panel supports two administrator sign-in methods:

1. **Email + Password + 2FA:** the administrator enters their email and password, then completes a separate second-factor challenge before a session is issued. The preferred second factor is a time-based one-time password (TOTP) from an authenticator app. Recovery codes must be generated securely, shown once, stored only as hashes, and invalidated when used. Email OTP may be offered as a controlled fallback only if explicitly enabled by platform policy.
2. **Passwordless Email OTP:** the administrator requests a one-time code at their pre-authorised email address and verifies it before a session is issued. This is a separate sign-in option, not a way to bypass the password-plus-2FA policy for accounts configured to require that method.

- Admin accounts are created/invited or elevated only through a trusted bootstrap or authorised administrator process. Public learner registration can never create or promote an admin.
- Store each admin's allowed authentication method and 2FA enrolment state in server-controlled account/security records. Do not allow a user to weaken their own required method.
- Require re-authentication or step-up verification for sensitive actions such as changing roles, resetting another admin's credentials, exporting learner data, changing authentication policy, and managing secrets.
- Enforce server-side role and permission checks on every admin API request. Hiding a page or button is not authorization.
- Apply OTP/password rate limits, temporary lockout or progressive delays, session expiry/revocation, secure recovery, and generic responses that reduce account enumeration.
- Record successful and failed admin sign-ins, factor changes, recovery-code use, privileged actions, and session revocations in an append-only audit trail. Never log passwords, OTP values, recovery codes, or session tokens.

### Shared OTP and session controls
1. Return generic responses for account lookup and OTP request flows.
2. Store OTP verification material as a secure hash; never store or log plaintext OTP values.
3. Enforce expiry, single-use consumption, attempt ceilings, resend cooldown, and per-account/per-IP rate limits.
4. Issue sessions only after all factors required by that account's policy have passed.
5. Use Secure, HttpOnly, SameSite cookies for browser sessions and protected native token storage for Android.
6. Revoke sessions on logout, account suspension, credential/factor reset, and security events.

## Proposed implementation stack
- **Backend:** TypeScript API on Cloudflare Workers.
- **Database:** Cloudflare D1 (SQLite-compatible relational database) for the first version; use migrations and indexes. Evaluate a different relational service only if measured workload or transaction needs require it.
- **Email:** provider adapter with server-side secrets (e.g. Resend or another transactional email service selected before integration).
- **Admin 2FA:** TOTP-compatible authenticator apps, with hashed one-time recovery codes. Confirm the exact fallback policy before production.
- **Learner web and admin web:** independently deployable frontends; keep admin app separate from learner navigation and enforce permissions in the API.
- **Android:** Capacitor wrapper and Android Gradle release build.
- **AI:** provider-neutral server-side adapter; select provider/model and configure secret during Phase 3.
- **Hosting:** Cloudflare Pages for static frontends and Workers for APIs is the proposed deployment baseline.

This is a proposed baseline, not a claim that these services have already been provisioned. Confirm provider accounts, domains, billing, and production secrets before live deployment.

## Initial data model
- `users`: id, email_normalized, email_verified_at, role, status, created_at, updated_at.
- `learner_profiles`: user_id, display_name, level, teaching_language, daily_target_minutes, preferences_json.
- `otp_challenges`: id, user_id/email_normalized, purpose, code_hash, expires_at, consumed_at, attempt_count, request_ip_hash, created_at.
- `admin_credentials`: user_id, password_hash, password_changed_at, password_policy_version.
- `admin_mfa_factors`: id, user_id, factor_type, secret_ciphertext, enrolled_at, verified_at, disabled_at; encrypt TOTP secrets with managed server-side key material.
- `admin_recovery_codes`: id, user_id, code_hash, used_at, created_at.
- `admin_auth_policies`: user_id, allowed_methods, required_second_factor, updated_by, updated_at.
- `sessions`: id, user_id, token_hash, auth_method, mfa_verified_at, expires_at, revoked_at, created_at.
- `units`, `lessons`, `lesson_translations`, `activities`, `questions`: versioned curriculum content.
- `lesson_attempts`, `quiz_attempts`, `answer_events`: learner activity and results.
- `vocabulary_items`, `learner_vocabulary`, `review_schedule`: vocabulary and spaced review.
- `skill_evidence`, `recommendations`: evidence-based mastery and next steps.
- `admin_audit_events`: actor, action, target, timestamp and safe metadata.
- `app_settings`: controlled platform configuration; secrets remain in secret storage, not this table.

## Security and privacy baseline
- HTTPS only; strict CORS allowlist; secure headers; input validation; output encoding.
- Least-privilege roles; server-side authorization; admin audit trail.
- Passwords hashed with a modern password-hashing algorithm such as Argon2id (or a platform-supported equivalent configured with current guidance); never reversible encryption.
- TOTP secrets encrypted at rest; recovery codes and OTP verification values stored as hashes.
- OTP/session/password-reset secrets and AI/email credentials stored as deployment secrets.
- Rate limiting for OTP, password attempts, MFA verification, AI, and sensitive admin operations.
- Avoid logging raw OTPs, passwords, recovery codes, session tokens, or unnecessary learner writing/audio.
- Data retention, export, deletion, and consent rules documented before production.
- Backups and restore tests before launch.

## Build order
1. API skeleton, database migrations, health endpoint and automated tests.
2. Learner email OTP, admin password + 2FA and admin passwordless email OTP, secure sessions, role-based access and admin bootstrap process.
3. Learner profile, curriculum API and cloud progress sync.
4. Separate admin app and protected management APIs.
5. AI tutor gateway, then speaking/listening and adaptive services.
6. Capacitor Android wrapper, signing and device QA.
