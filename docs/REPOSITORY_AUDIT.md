# Repository Audit — 2026-10-31

## Scope inspected
- Default branch: `main`
- Recursive Git tree: complete (not truncated)
- Files present at audit time: `README.md`, `index.html`
- No nested folders, package manifest, automated tests, backend, database schema, deployment workflow, or environment example were present.
- Existing application: a single-file HTML/CSS/JavaScript beginner learning dashboard.

## Existing functionality verified by code inspection
- Responsive dashboard and navigation.
- Five starter lessons: greetings, self-introduction, alphabet, numbers 1–10, everyday words.
- Sinhala translations and browser SpeechSynthesis pronunciation.
- Starter vocabulary list with learned-word tracking.
- Five-question multiple-choice practice quiz.
- Lesson completion and basic progress indicators.
- Progress persistence through browser `localStorage`.

## Gaps and risks
1. The product name includes AI, but no AI service or backend is connected.
2. Speaking and listening are not yet structured learning modules; text-to-speech is only a pronunciation aid.
3. Writing feedback, grammar curriculum, reading passages, guided conversation, pronunciation assessment, spaced repetition, and adaptive lesson selection are absent.
4. Progress is device/browser-local and cannot sync across devices or accounts.
5. No server-side persistence, authentication, privacy controls, rate limiting, or API secret management exists.
6. No automated tests, accessibility checks, CI workflow, or deployment configuration exists.
7. The current lesson completion action can be triggered without passing the lesson check; the quiz does not yet provide a durable result summary.
8. Content is hard-coded inside `index.html`, making curriculum growth and translation review harder.

## Audit conclusion
The repository is a useful Phase 1 prototype, not a complete AI learning platform. Preserve the existing beginner experience while separating curriculum, interface, services, and tests. Build and verify each phase independently. Do not claim AI, account sync, or speech assessment until those services are implemented and configured.

## Implementation sequence
- Phase 1: stable learning foundation, structured curriculum, accessible practice, reliable local progress, test coverage.
- Phase 2: AI tutor and writing feedback through a server-side API; provider key stored only as a deployment secret.
- Phase 3: speaking/listening exercises, microphone permissions, speech recognition where supported, pronunciation practice.
- Phase 4: learner profile, mastery tracking, spaced review, weak-skill detection, adaptive recommendations.
- Phase 5: secure accounts, cloud sync, reporting, production deployment, operational monitoring and privacy controls.
