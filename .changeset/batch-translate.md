---
"@deeplx/cli": minor
"@deeplx/core": minor
---

feat: translate many texts in a single oneshot request

`translateByDeepLX` now accepts `text: string | readonly string[]`. An array is
sent as one oneshot request whose `text` is that array, and the result's `data`
is a position-aligned `string[]` (`DeepLXBatchTranslationResult`); a string
argument keeps the previous request, response and error shapes exactly.

The anonymous oneshot endpoint caps the **sum** of all `text` items at 1500
characters, so callers must chunk a document by total length rather than by
segment count. `translateByDeepLX` checks that limit locally and resolves to the
existing 413 error result instead of letting DeepL answer 400.

A batch either succeeds with one translation per text or fails as a whole: an
empty array, and a response whose `translations` length does not line up with the
requested texts, throw an `Error` carrying the library's
`DeepLXTranslationErrorResult` as `cause`, instead of returning placeholders or
misaligned data.

The CLI is aligned on top of it: `--text` and `--file` are repeatable, every
value is a segment of one batch, and `deeplx` chunks those segments by total
length, so one invocation translates a whole document in as few requests as the
limit allows and prints one translation per segment, in order.
