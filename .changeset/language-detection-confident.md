---
"@deeplx/core": minor
---

feat: expose `languageDetectionConfident` on translation results

DeepL reports `is_language_detection_confident` on every oneshot translation, but
the response type dropped it and `processTranslationResponse` never passed it on.

That flag is what tells a real detection apart from an echoed request: when it is
`false`, `detected_source_language` only repeats the requested `source_lang` (or
the endpoint's default) rather than an independently detected language. Verified
against the live endpoint:

| request                                   | `detected_source_language` | `is_language_detection_confident` |
| ----------------------------------------- | -------------------------- | --------------------------------- |
| English sentence, `source_lang: zh`, `EN` | `zh`                       | `false`                           |
| same sentence, no `source_lang`, `EN`     | `en`                       | `false`                           |
| same sentence, `source_lang: zh`, `DE`    | `zh`                       | `false`                           |
| Chinese sentence, `source_lang: en`, `EN` | `zh`                       | `true`                            |
| Chinese sentence, no `source_lang`, `EN`  | `zh`                       | `true`                            |

The English rows are the mirroring: the endpoint answers 200 and reports the
requested `zh` back, so a caller that only sees `sourceLang: 'ZH'` cannot tell its
own hint was echoed. The `true` rows are the ones where detection actually
overrode the hint.

The new optional `languageDetectionConfident?: boolean` field on
`DeepLXTranslationSuccessResult` is strictly additive: it is only populated when
the endpoint reports the flag, and no existing field changes.
