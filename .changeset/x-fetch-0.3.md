---
"@deeplx/core": patch
---

fix: update `x-fetch` to `0.3` and migrate the oneshot error handling

`x-fetch@0.3` replaces `ResponseError` with `XFetchError` plus the
`isXFetchError` type guard, so `parseTranslationError` now narrows through that
guard instead of `instanceof`.

The same class also wraps transport failures and bodies that cannot be parsed,
so only a response with an error status is treated as a DeepL status; an `ok`
response can never be reported as a successful translation. The observable
behaviour of the `403` (with `title`/`message` detail), `429` and other-status
branches is unchanged.
