# Lingua AI English Academy

A mobile-friendly English learning academy for learners starting from zero, using gradual Sinhala-to-English teaching and a 15-minute daily routine.

## Learner profile
- Starting level: Absolute beginner (zero)
- Teaching approach: Sinhala explanations first, gradually increasing English
- Goals: Speaking, listening, reading, writing, grammar, vocabulary, and pronunciation
- Daily target: 15 minutes

## Current repository status
The Phase 1 learner app in `index.html` provides a responsive dashboard, five starter lessons, Sinhala meanings, browser text-to-speech, vocabulary tracking, a five-question quiz, and local browser progress. It now also includes a searchable Sinhala ↔ English starter dictionary with English/Sinhala/automatic search, examples, pronunciation playback, saved words, recent searches, and a daily word.

A full repository audit and product requirements are documented in:
- [Repository audit](docs/REPOSITORY_AUDIT.md)
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Phased roadmap](docs/PHASE_ROADMAP.md)
- [Platform architecture](docs/PLATFORM_ARCHITECTURE.md)
- Structured beginner curriculum: `curriculum/pre-a1-a1-foundation.json`\n- Dictionary starter dataset: `dictionary-data.js`\n- Dictionary data tests: `node --test tests/dictionary.test.js`

## Run the current prototype
1. Clone or download this repository.
2. Open `index.html` in a modern browser.
3. Progress is saved in that browser on that device.

No build tools or API keys are needed for the current static prototype.

## Important implementation status
The current browser prototype is not yet a complete AI platform. The dictionary is currently a local starter dataset and browser-side search; a managed dictionary API, larger reviewed/licensed dataset, AI tutoring, server APIs, accounts, cloud synchronisation, speech recognition, pronunciation scoring, and adaptive learning must not be considered available until their later phases are implemented, configured, and tested.

The backend, admin panel, authentication methods, dictionary module, and Android APK are specified in project requirements and architecture; they are not yet implemented or production-ready.

Never put AI provider keys or other secrets in browser JavaScript or committed files.

## Platform requirements
- Separate server-side backend API and database.
- Separate administrator web panel with server-enforced role-based access.
- Learner registration/login using passwordless email OTP.
- Admin Panel supports both Email + Password + 2FA and passwordless Email OTP.
- Password-based admin login must verify both factors; the proposed default second factor is authenticator-app TOTP.
- Sinhala ↔ English dictionary with two-way search, meanings, pronunciation, bilingual examples, saved words and revision.
- Dictionary content must be reviewed and properly licensed/attributed.
- Shared cloud learner account and progress across web and Android.
- Installable Android APK for learners, initially planned with a Capacitor wrapper.

## Phased delivery
1. **Phase 1 — Learning foundation:** curriculum, beginner lessons, four-skill practice, initial bilingual dictionary, quizzes, revision, and reliable local progress.
2. **Phase 2 — Backend and accounts:** backend API, database, learner email OTP, both admin login methods, secure sessions, separate admin panel, dictionary management and cloud progress sync.
3. **Phase 3 — AI English Teacher:** Sinhala explanations, sentence correction, guided conversations, writing feedback, and reviewed AI-assisted dictionary support through a secured server endpoint.
4. **Phase 4 — Speaking, listening and adaptive learning:** audio practice, microphone features, mastery tracking, weak-area detection, spaced revision, and personalised next lessons.
5. **Phase 5 — Android APK and production:** Android packaging/signing, shared account sync, dictionary mobile QA, reports, privacy controls, deployment, and monitoring.

See [the roadmap](docs/PHASE_ROADMAP.md) and [Platform Architecture](docs/PLATFORM_ARCHITECTURE.md) for implementation details.


## Latest learning improvements

- Dictionary search now updates as the learner types and displays matching suggestions in English or Sinhala.
- Dictionary entries show five beginner sentence patterns with Sinhala support, adapted to the word's part of speech.
- Every lesson ends with a five-question exam. A learner needs at least 4/5 (80%) to pass.
- Failed attempts can be retried with a newly selected question set.
- Regression tests are in `tests/`; GitHub Actions runs them on pushes and pull requests using `node --test tests/*.test.js`.



## Dictionary expansion

The beginner dictionary now contains 171 entries, including a new categorized everyday-vocabulary batch. The longer-term target is 1,000+ reviewed words. See [Dictionary Expansion and AI-Assisted Lookup](docs/DICTIONARY_EXPANSION.md) for the staged vocabulary plan, data-quality rules and secure AI lookup design. AI lookup is documented as a backend feature and is not active yet.
