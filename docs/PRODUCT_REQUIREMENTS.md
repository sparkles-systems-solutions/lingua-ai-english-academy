# Lingua AI English Academy — Product Requirements

## Learner profile
- Starting level: absolute beginner (zero).
- Teaching language: gradual Sinhala-to-English support; explanations may begin in Sinhala and progressively use more English.
- Outcomes: speaking, listening, reading, writing, grammar, vocabulary, and pronunciation.
- Daily practice target: 15 minutes.
- Learning style: simple, memorable, interactive, encouraging, and conversational.

## Core learner experience
1. Student dashboard with daily target, current lesson, progress, and recommended next action.
2. Beginner-to-A1 structured lessons with Sinhala explanations, examples, audio support, and exercises.
3. AI English Teacher that identifies mistakes, explains them in Sinhala, provides a corrected sentence, asks the learner to retry, tracks recurring weak areas, and adapts the next activity.
4. Speaking and listening practice, including guided everyday conversations and pronunciation support.
5. Reading passages with comprehension questions.
6. Writing exercises with grammar and sentence feedback.
7. Grammar Academy with progressive explanations and practice.
8. Vocabulary builder with pronunciation, examples, learned status, and revision.
9. Daily quizzes and spaced review.
10. Progress history and reports across all four skills.

## Teaching principles
- Never assume prior English knowledge.
- Introduce one concept at a time.
- Show English first with Sinhala support as needed.
- Use everyday examples relevant to a Sri Lankan beginner.
- Encourage retrying rather than penalising mistakes.
- Do not label a skill as mastered from a single correct answer.
- Keep the daily plan close to 15 minutes and allow learners to pause.

## Quality requirements
- Mobile-first responsive UI.
- Keyboard accessibility and clear focus states.
- Do not expose API keys in browser code or Git.
- Request microphone permission only when the learner starts a speaking activity.
- Clearly explain browser/device support for speech features.
- Save progress safely and provide a clear privacy explanation.
- Tests for lesson flow, answer evaluation, progress persistence, and API failure handling.

## Platform and account requirements (added 2026-10-31)

### Separate backend
- Build a dedicated backend API, separate from the learner web interface and admin panel.
- The backend is the trusted source for authentication, learner profiles, curriculum delivery, AI tutor requests, learning activity, progress, reports, and platform settings.
- Validate all inputs and enforce authorization on the server; never rely on hidden UI controls for security.
- Keep database credentials, email-provider credentials, AI-provider keys, and signing secrets in deployment secret storage, never in Git or browser code.
- Include API versioning, structured error responses, request validation, rate limiting, audit events for privileged actions, and automated tests.

### Separate admin panel
- Build a separate admin web application and route/deployment from the learner application.
- Admin access must be role-based and protected by server-side authorization.
- Admin features: overview dashboard, learner account management, curriculum/lesson management, vocabulary and quiz management, AI tutor configuration, usage/learning reports, and platform settings.
- Admin actions that change learner access or curriculum must be auditable.
- Learner-facing registration must never grant admin privileges.

### Email registration and OTP login
- Learners can register and sign in using an email address.
- Send a short-lived one-time passcode (OTP) to the supplied email address and verify it before issuing a session.
- Include OTP expiry, single-use enforcement, resend cooldown, attempt limits, rate limiting, generic responses that reduce account enumeration, and secure session expiry/revocation.
- Store OTP verification material securely (prefer hashed codes); do not log OTP values.
- Do not require a password for the initial passwordless email OTP flow. Password or social login may be considered later only if explicitly approved.
- Email delivery provider must be configurable; credentials stay server-side.

### Android APK
- Deliver an installable Android APK for the learner application.
- Reuse the learner web experience where practical through a maintained Android wrapper (for example Capacitor), while keeping native permissions and device integration explicit.
- APK must use the same backend and learner account as the web app so progress synchronises across devices.
- Include app signing, versioning, release build instructions, and a repeatable build process.
- Do not claim an APK is ready until a release build has been generated and tested on Android devices.

### Cross-platform data
- A learner's profile, completed lessons, quiz history, vocabulary mastery, review schedule, and learning analytics should sync through the backend.
- Clearly show offline or sync-pending states; resolve conflicts safely and never silently discard progress.
