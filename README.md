# Lingua AI English Academy

A mobile-friendly English learning academy for learners starting from zero, using gradual Sinhala-to-English teaching and a 15-minute daily routine.

## Learner profile
- Starting level: Absolute beginner (zero)
- Teaching approach: Sinhala explanations first, gradually increasing English
- Goals: Speaking, listening, reading, writing, grammar, vocabulary, and pronunciation
- Daily target: 15 minutes

## Current repository status
The original Phase 1 browser prototype is preserved in `index.html`. It currently provides a responsive dashboard, five starter lessons, Sinhala meanings, browser text-to-speech, vocabulary tracking, a five-question quiz, and local browser progress.

A full repository audit and product requirements are documented in:
- [Repository audit](docs/REPOSITORY_AUDIT.md)
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Phased roadmap](docs/PHASE_ROADMAP.md)
- [Acceptance checklist](tests/ACCEPTANCE_CHECKLIST.md)

Structured beginner curriculum: `curriculum/pre-a1-a1-foundation.json`.

## Run the current prototype
1. Clone or download this repository.
2. Open `index.html` in a modern browser.
3. Progress is saved in that browser on that device.

No build tools or API keys are needed for the current static prototype.

## Important implementation status
The current browser prototype is not yet a complete AI platform. AI tutoring, server APIs, accounts, cloud synchronisation, speech recognition, pronunciation scoring, and adaptive learning must not be considered available until their later phases are implemented, configured, and tested.

Never put AI provider keys or other secrets in browser JavaScript or committed files.

## Platform requirements
- Separate server-side backend API and database.
- Separate administrator web panel with role-based access.
- Passwordless email registration/login using short-lived, single-use OTP codes.
- Shared cloud learner account and progress across web and Android.
- Installable Android APK for learners, initially planned with a Capacitor wrapper.

## Phased delivery
1. **Phase 1 — Learning foundation:** curriculum, accessible lesson engine, four-skill beginner practice, quizzes, revision, and reliable local progress.
2. **Phase 2 — Backend and accounts:** backend API, database, email OTP login, secure sessions, separate admin panel, and cloud progress sync.
3. **Phase 3 — AI English Teacher:** Sinhala explanations, sentence correction, guided conversations, and writing feedback through a secured server endpoint.
4. **Phase 4 — Speaking, listening and adaptive learning:** audio practice, microphone features, mastery tracking, weak-area detection, spaced revision, and personalised next lessons.
5. **Phase 5 — Android APK and production:** Android packaging/signing, shared account sync, reports, privacy controls, deployment, and monitoring.

See [the roadmap](docs/PHASE_ROADMAP.md) and [Platform Architecture](docs/PLATFORM_ARCHITECTURE.md) for implementation details.
