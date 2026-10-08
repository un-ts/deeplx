---
"@deeplx/core": patch
---

fix: send the generic `zh` as the Chinese `source_lang`

DeepL does not accept the target-only script variants (`zh-Hans` / `zh-Hant`) as
a Chinese source hint: it behaves exactly as if `source_lang` were omitted.
`SOURCE_LANG_MAP` is derived from `TARGET_LANG_MAP` and only overrode `EN` and
`PT`, so `ZH`, `ZH-HANS` and `ZH-HANT` all resolved to those target forms.

On ambiguous mixed-script Chinese, auto-detection then reads the Latin terms as
English, and with an English target the oneshot endpoint returns the input
unchanged with HTTP 200 — a silent no-op that callers cannot tell apart from a
successful translation.

Mapping the three keys to the generic `zh` fixes it for both Simplified and
Traditional. `TARGET_LANG_MAP` is untouched.
