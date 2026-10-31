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
- Authentication: email OTP issuance and verification, session lifecycle, logout, revocation.
- Authorization: learner/admin roles enforced on every protected API route.
- Learner: profile, preferences, daily target and account state.
- Curriculum: units, lessons, translations, examples, activities, quizzes and versioning.
- Learning: attempts, answers, completion, vocabulary mastery, skill evidence, review queue.
- AI gateway: validate requests, apply limits, call configured model provider, return structured tutor feedback.
- Administration: account actions, content publishing, reports, audit events.
- Synchronisation: authoritative server records, idempotent writes, updated timestamps and conflict-safe merge.

## Email OTP security
1. Learner submits an email address.
2. API returns a generic response and sends a time-limited OTP through a configurable email provider.
3. OTP is single-use and verified server-side. Store a keyed hash or secure hash of the code, not the plain code.
4. Apply per-email and per-IP limits, expiry, attempt ceilings, resend cooldown, and anti-abuse controls.
5. On success, issue a secure session (httpOnly, Secure, SameSite cookie for web; protected native token storage for Android).
6. Never include OTPs in logs, analytics, URLs, or client-side persistent storage.
7. Admin accounts are provisioned or elevated only by an authorised admin process; public registration cannot create admins.

## Proposed implementation stack
- **Backend:** TypeScript API on Cloudflare Workers.
- **Database:** Cloudflare D1 (SQLite-compatible relational database) for the first version; use migrations and indexes. Evaluate a different relational service only if measured workload or transaction needs require it.
- **Email:** provider adapter with server-side secrets (e.g. Resend or another transactional email service selected before integration).
- **Learner web and admin web:** independently deployable frontends; keep admin app separate from learner navigation and enforce permissions in the API.
- **Android:** Capacitor wrapper and Android Gradle release build.
- **AI:** provider-neutral server-side adapter; select provider/model and configure secret during Phase 3.
- **Hosting:** Cloudflare Pages for static frontends and Workers for APIs is the proposed deployment baseline.

This is a proposed baseline, not a claim that these services have already been provisioned. Confirm provider accounts, domains, billing, and production secrets before live deployment.

## Initial data model
- `users`: id, email_normalized, email_verified_at, role, status, created_at, updated_at.
- `otp_challenges`: id, email_normalized, code_hash, expires_at, consumed_at, attempt_count, request_ip_hash, created_at.
- `sessions`: id, user_id, token_hash, expires_at, revoked_at, created_at.
- `learner_profiles`: user_id, display_name, level, teaching_language, daily_target_minutes, preferences_json.
- `units`, `lessons`, `lesson_translations`, `activities`, `questions`: versioned curriculum content.
- `lesson_attempts`, `quiz_attempts`, `answer_events`: learner activity and results.
- `vocabulary_items`, `learner_vocabulary`, `review_schedule`: vocabulary and spaced review.
- `skill_evidence`, `recommendations`: evidence-based mastery and next steps.
- `admin_audit_events`: actor, action, target, timestamp and safe metadata.
- `app_settings`: controlled platform configuration; secrets remain in secret storage, not this table.

## Security and privacy baseline
- HTTPS only; strict CORS allowlist; secure headers; input validation; output encoding.
- Least-privilege roles; server-side authorization; admin audit trail.
- OTP/session secrets and AI/email credentials stored as deployment secrets.
- Rate limiting for OTP, AI, and sensitive admin operations.
- Avoid logging raw OTPs, session tokens, or unnecessary learner writing/audio.
- Data retention, export, deletion, and consent rules documented before production.
- Backups and restore tests before launch.

## Build order
1. API skeleton, database migrations, health endpoint and automated tests.
2. Email OTP, sessions, role-based access and admin bootstrap process.
3. Learner profile, curriculum API and cloud progress sync.
4. Separate admin app and protected management APIs.
5. AI tutor gateway, then speaking/listening and adaptive services.
6. Capacitor Android wrapper, signing and device QA.
