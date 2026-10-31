# Acceptance Checklist

## Phase 1
- [ ] Dashboard and navigation work on mobile and desktop.
- [ ] Beginner lesson text and Sinhala explanations render correctly.
- [ ] Learner must attempt the lesson check before marking a lesson complete.
- [ ] Quiz score and answer feedback are shown at completion.
- [ ] Vocabulary learned status survives refresh.
- [ ] Lesson progress survives refresh.
- [ ] Speech synthesis handles browsers without support.
- [ ] No console errors during the core learning flow.
- [ ] Keyboard navigation and visible focus are usable.

## Phase 2
- [ ] AI key exists only in server-side secret storage.
- [ ] Sinhala mistake explanation and corrected sentence are returned.
- [ ] Learner can retry after feedback.
- [ ] Empty, oversized, and malformed requests are handled.
- [ ] Provider timeout and unavailable errors are handled.
- [ ] Rate limiting and abuse protections are enabled.

## Phase 3
- [ ] Listening activity works without microphone permission.
- [ ] Microphone permission is requested only after user action.
- [ ] Permission denial and unsupported recognition have useful fallbacks.
- [ ] Speech feedback is not overstated as a certified pronunciation score.

## Phase 4
- [ ] Weak skills are based on multiple attempts.
- [ ] Review queue schedules previously learned content.
- [ ] Recommendations include a reason.
- [ ] Learner can still choose a different lesson.

## Phase 5
- [ ] Account data is isolated between learners.
- [ ] Cloud sync conflict handling is tested.
- [ ] Data export and deletion are documented and tested.
- [ ] Deployment and rollback steps are documented.
- [ ] Monitoring excludes sensitive learner content.

## Sinhala ↔ English Dictionary
- [ ] Dictionary is reachable from the learner navigation on desktop and mobile.
- [ ] English-to-Sinhala search returns matching entries.
- [ ] Sinhala-to-English search handles Sinhala Unicode input.
- [ ] Auto-detect search finds entries in either language.
- [ ] Multiple meanings and part-of-speech labels are displayed.
- [ ] Example sentences show Sinhala translations.
- [ ] Pronunciation playback uses the browser speech feature and fails gracefully if unavailable.
- [ ] Learners can save and remove words; saved words persist after refresh.
- [ ] Recent searches persist and can be cleared.
- [ ] Daily word is displayed and can be opened in search.
- [ ] Empty searches and no-result searches show helpful messages.
- [ ] Dictionary data contains unique IDs and valid examples.
- [ ] No dictionary search query is inserted into HTML without escaping.

- [ ] Dictionary suggestions update while typing without filling recent-search history on every keystroke.
- [ ] Selecting a dictionary suggestion opens its complete entry.
- [ ] Every dictionary result shows five bilingual vocabulary-practice prompts.
- [ ] Each lesson ends with a five-question exam.
- [ ] A score of at least 4/5 is required to pass and complete a lesson.
- [ ] Failed learners can retry and receive a different question set.
- [ ] Repeated retries do not immediately repeat the same five-question set.
- [ ] Lesson exam pass/fail and retry flows work on mobile and desktop browsers.
