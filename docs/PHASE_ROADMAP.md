# Delivery Roadmap

## Phase 1 — Learning foundation (current)
- Preserve and improve the current responsive beginner dashboard.
- Move learning content into structured curriculum data.
- Add progressive A1 lesson groups, grammar, reading, writing, listening and speaking starter activities.
- Improve quiz scoring, lesson validation, revision, and local progress persistence.
- Add test and quality checks.

**Exit criteria:** learner can complete a daily 15-minute beginner session and practise all four skills with browser-supported tools. Local progress works reliably while the backend is being built.

## Phase 2 — Backend, accounts, and admin foundation
- Create a dedicated backend API and database schema.
- Implement learner registration/login using short-lived, single-use email OTP.
- Implement both admin sign-in methods: (a) Email + Password + 2FA, and (b) passwordless Email OTP.
- For password-based admin login, require successful verification of both password and a separate second factor (proposed default: authenticator-app TOTP); include secure recovery codes.
- Add secure sessions, rate limits, resend cooldowns, lockout/progressive delays, audit events, and role-based authorization.
- Build a separate admin panel with learner management and curriculum/content management.
- Move learner progress from browser-only storage to authenticated cloud sync, preserving local progress during migration.
- Add API tests, authentication tests, authorization tests, MFA-bypass tests, and account-isolation tests.

**Exit criteria:** learner can sign in using email OTP; admin can use either approved sign-in method; password-based admin login cannot bypass 2FA; admin routes and APIs are protected by server-side roles; progress syncs between web sessions; no secrets are exposed in client code.

## Phase 3 — AI English Teacher and learning content services
- Add a server-side AI tutor endpoint; no provider secret in client code.
- Sinhala-first explanations, mistake correction, corrected examples, and retry prompts.
- Guided turn-by-turn conversations and writing feedback.
- Admin-managed tutor settings and curriculum content.
- Safe input handling, request limits, cost controls, and graceful provider errors.

**Exit criteria:** configured AI provider gives contextual feedback through the secured backend; missing credentials produce a clear setup state.

## Phase 4 — Speaking, listening, and adaptive learning
- Audio-led listening tasks and comprehension checks.
- Microphone-based speaking activities with explicit permission.
- Browser/device-compatible speech recognition and safe fallback practice.
- Pronunciation practice; do not claim phoneme-level scoring unless technically supported and validated.
- Learner mastery model by skill and topic, weak-area detection, spaced review queue, and transparent next-lesson recommendations.

**Exit criteria:** speaking/listening gracefully handle unsupported browsers and denied permissions; adaptive recommendations are based on multiple attempts and can be overridden by the learner.

## Phase 5 — Android APK and production academy
- Package the learner app as an Android application (recommended initial approach: Capacitor wrapper around the learner web app).
- Use the same backend, email OTP account, and progress data as the web application.
- Configure Android app identity, permissions, signing, versioning, and repeatable release builds.
- Complete data export/delete controls, privacy documentation, reports, backup strategy, deployment workflow, monitoring, and production hardening.
- Test APK installation, login, navigation, audio/microphone permissions, sync, and update/upgrade behaviour on real Android devices.

**Exit criteria:** signed APK is built and device-tested; web and APK share the same account and progress; production deployment, data isolation, recovery, and monitoring are verified.

## Architecture proposal
See [Platform Architecture](PLATFORM_ARCHITECTURE.md). The proposed baseline is a separate learner web app, separate admin app, server-side API, managed relational database, email OTP delivery adapter, and Android wrapper. Cloudflare Workers + D1 are a practical starting option given the project's deployment context; final provider choices should be confirmed before production credentials or paid services are configured.

## Dependencies and configuration
- Email delivery provider account/key for Phase 2; store as a server-side secret only.
- Hosting and database account for backend APIs and cloud progress.
- Authenticator-app TOTP implementation and secure recovery-code handling for admin password + 2FA.
- AI provider account/key for Phase 3; store as a server-side secret only.
- Android build environment and signing key for Phase 5; never commit signing secrets.
- Speech capabilities vary by browser, OS, and language pack.
- No credentials or personal learner data should be committed to this repository.
