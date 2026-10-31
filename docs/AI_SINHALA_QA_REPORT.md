# AI Sinhala–English Dictionary QA Report

**Scope:** All 171 dictionary entries in `dictionary-data.js`  
**Review method:** AI-assisted semantic, usage, grammar, and learner-clarity review of headwords, Sinhala meanings, parts of speech, and available bilingual examples.  
**Review date:** 2026-10-31  
**Status:** AI-reviewed; not human-certified.

## What was checked

- English headword and Sinhala meaning alignment.
- Multiple meanings and context-sensitive translations.
- Part-of-speech consistency.
- Whether each English example has a matching Sinhala sentence.
- Natural Sinhala word order, particles, verb forms, and everyday usage.
- Beginner friendliness and misleading literal translations.
- Structural completeness and duplicate IDs.

## Corrections made in this pass

- Changed greeting spellings in the dictionary entries and examples to the consistent form `සුබ`.
- Standardized `Thank you` examples to `ස්තුතියි`.
- Corrected `No, thank you` to `නැහැ, ස්තුතියි` rather than `එපා, ස්තූතියි`.
- Removed `බල්ලි` as a generic translation for `dog`; retained `බල්ලා` and the natural indefinite form `බල්ලෙක්`.
- Clarified the gender-neutral learner gloss for `cousin` as `ඥාති සහෝදරයා / සහෝදරිය`.
- Added `පිපාසය ඇති` as a clearer Sinhala gloss for `thirsty`.
- Improved the `sunny` example to `අද හොඳට අව්ව පායනවා.`
- Kept the `love learning English` example as a natural learner-level expression of strong liking, rather than forcing a literal word-for-word translation.
- Removed automatically generated generic noun/verb/adjective practice sentences from the learner UI. Only word-specific reviewed examples are displayed.

## QA result

- Entries reviewed: 171 / 171.
- Structural checks: automated.
- Duplicate ID check: automated.
- Bilingual example presence: automated.
- Targeted regression tests: added for corrections above.
- Browser and Android visual UAT: not performed in this run.
- Independent human linguistic certification: not performed.

## Known limitations and ongoing policy

AI review can miss dialect differences, register issues, subtle grammar errors, and context-dependent meanings. Sinhala may vary by region and formality. Treat these translations as AI-reviewed learning content, not certified dictionary definitions. If an item is ambiguous, prefer a simple common meaning and a natural example over adding uncertain alternatives.

For every future vocabulary batch, run the same checks before publishing. Do not generate generic Sinhala practice sentences by appending a dictionary gloss to an English sentence. Add only reviewed, word-specific bilingual examples.
