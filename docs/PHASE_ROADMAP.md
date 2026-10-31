# Delivery Roadmap

## Phase 1 — Learning foundation
- Preserve and improve the current responsive beginner dashboard.
- Move learning content into structured curriculum data.
- Add progressive A1 lesson groups, grammar, reading, writing, listening and speaking starter activities.
- Improve quiz scoring, lesson validation, revision, and progress persistence.
- Add test and quality checks.

**Exit criteria:** learner can complete a daily 15-minute beginner session, practise all four skills with browser-supported tools, and retain progress on the same device.

## Phase 2 — AI English Teacher
- Server-side tutor endpoint; no provider secret in client code.
- Sinhala-first explanations and corrected examples.
- Guided turn-by-turn conversations and writing feedback.
- Retry loop, safe input handling, request limits, and graceful provider errors.

**Exit criteria:** configured AI provider can give contextual feedback and retry prompts through the server API; missing credentials produce a helpful setup message, not a broken app.

## Phase 3 — Speaking and listening
- Audio-led listening tasks and comprehension checks.
- Microphone-based speaking activities with explicit permission.
- Browser speech recognition where available and fallback self-practice.
- Pronunciation practice and clear limitations (not claim phoneme-level scoring unless supported).

**Exit criteria:** listening tasks work without a microphone; speaking tasks handle unsupported browsers and denied permissions safely.

## Phase 4 — Adaptive learning
- Learner mastery model by skill and topic.
- Weak-area detection based on repeated evidence.
- Spaced review queue and due dates.
- Recommendation engine with transparent reasons.

**Exit criteria:** recommendations reflect actual learner performance and revision scheduling.

## Phase 5 — Accounts and production
- Authentication and secure cloud progress sync.
- Data export/delete controls and privacy documentation.
- Reports, backup strategy, deployment workflow, monitoring, and production hardening.

**Exit criteria:** end-to-end deployment and verified account isolation, data security, recovery, and operational monitoring.

## Dependencies and configuration
- AI provider account/key for Phase 2; store as a server-side secret only.
- Hosting and database account for cloud APIs and Phase 5.
- Speech capabilities vary by browser, OS, and language pack.
- No credentials or personal learner data should be committed to this repository.
