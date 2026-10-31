# Dictionary Expansion and AI-Assisted Lookup

## Goal

Grow the learner dictionary to at least 1,000 useful English headwords with Sinhala meanings. This is a quality-controlled target, not a claim that 1,000 entries are already available.

## Current implementation

- 171 dictionary entries are present after the latest expansion.
- Added a second curated batch of 45 beginner words covering family, people, home, food, shopping, transport, places, time, actions, feelings, descriptions and weather. The dictionary contains 171 entries in total.
- New entries carry a category, part of speech, Sinhala meaning and a bilingual example.
- The existing live search and suggestion UI reads from the same dictionary dataset.

## Expansion plan to 1,000

Build and review vocabulary in batches, retaining a visible category and level for every entry.

| Vocabulary group | Target entries |
|---|---:|
| People and family | 80 |
| Home and everyday objects | 100 |
| Food and shopping | 100 |
| Time, numbers and dates | 80 |
| Places and transport | 100 |
| Common actions and verbs | 180 |
| Describing words and feelings | 120 |
| Health and body | 70 |
| School, work and technology | 90 |
| Nature, weather and environment | 80 |
| Useful phrases and connectors | 100 |
| **Total target** | **1,100** |

The target is intentionally above 1,000 so entries can be removed during review without falling below the minimum.

## Quality rules

1. Do not add duplicate headwords or unstable IDs.
2. Use natural Sinhala meanings, including alternate meanings where context requires them.
3. Mark part of speech and category.
4. Add at least one natural English example and a Sinhala translation.
5. Review translations before treating them as authoritative.
6. Clearly label AI-generated suggestions as unverified until reviewed.
7. Do not copy data from a source unless its licence and attribution requirements are confirmed and recorded.

## Candidate external source

The Open Sinhala Database project describes an English–Sinhala and Sinhala–English database and publishes its project under the MIT licence:
- Repository: https://github.com/ipmanlk/OSDB-Project
- Database repository: https://github.com/ipmanlk/OSDB
- Licence: MIT

This is a candidate source for a future import and comparison workflow. No bulk data from it has been copied into this project in this update. Before importing, verify the source files, current licence notice, data provenance, translation quality and attribution requirements.

## AI-assisted lookup – planned backend contract

AI lookup must not call a paid AI provider directly from browser JavaScript and must never expose an API key in the website.

Proposed endpoint: `POST /api/dictionary/assist`

Request:
```json
{ "query": "unlisted English or Sinhala word", "direction": "auto", "learnerLevel": "pre-A1" }
```

Response:
```json
{
  "found": true,
  "source": "ai_suggestion",
  "verified": false,
  "headword": "example",
  "partOfSpeech": "noun",
  "meanings": ["උදාහරණය"],
  "examples": [
    { "en": "This is an example.", "si": "මේක උදාහරණයක්." }
  ],
  "notice": "AI-generated suggestion. Please verify before learning."
}
```

Required controls before production:
- Server-side provider adapter and secret storage.
- Authentication or strict anonymous rate limits, request-size limits and abuse protection.
- Output schema validation and safe rendering.
- Cache repeated lookups and monitor provider costs.
- Do not silently add AI results to the trusted dictionary.
- Let learners report incorrect suggestions.
- Admin review and publish workflow before an AI suggestion becomes a verified dictionary entry.
- Return a clear unavailable response if the AI service is not configured; do not fabricate a translation.

## UAT

- [ ] Search English headwords such as dog, family, house and speak.
- [ ] Search Sinhala meanings such as බල්ලා and ගෙදර.
- [ ] Suggestions update while typing.
- [ ] Category and part-of-speech metadata remain available.
- [ ] Every result displays Sinhala meanings and bilingual examples.
- [ ] Unknown words show a clear not-found state.
- [ ] AI suggestions are visibly marked unverified and never saved as verified entries.
- [ ] Search remains usable on a narrow mobile screen.
