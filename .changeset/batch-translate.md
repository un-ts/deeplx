---
"@deeplx/cli": minor
"@deeplx/core": minor
"deeplx": minor
---

feat: translate many texts in a single oneshot request

`translate` and `translateByDeepLX` now accept `text: string | readonly
string[]`. An array is sent as one oneshot request whose `text` is that array:
`translate` resolves to a position-aligned `string[]`, and `translateByDeepLX`
to a result whose `data` is that `string[]` (`DeepLXBatchTranslationResult`). A
string argument keeps the previous request, response and error shapes exactly.

The anonymous oneshot endpoint caps the **sum** of all `text` items at 1500
characters, counted in UTF-16 code units (`String.prototype.length`: a CJK
character costs 1, an astral emoji 2 — probed against the live endpoint, which
accepts 750 emoji and rejects 751, while accepting 2400 bytes of CJK). Callers
must chunk a document by total length rather than by segment count.
`translateByDeepLX` checks that limit locally and resolves to the existing 413
error result instead of letting DeepL answer 400.

Emptiness is not an error: a text that carries something is translated, a blank
text (empty or whitespace-only) is answered with itself without being sent, and
an empty array is answered with an empty array, so a segmented document keeps its
positions and the caller never has to filter or remap anything. This mirrors the
server-side `/translate`. A request that names no text — `null`, `undefined`, a
wrong type, or a list holding something other than a string — resolves to the
same `400 Invalid request payload` the server-side `/translate` answers, while a
`null` or missing element inside a list is the empty string, as it is there. The
one failure left is a response that does not line
up with the sent texts, which throws an `Error` carrying the library's
`DeepLXTranslationErrorResult` as `cause`.

`chunkByLength` is exported so that a caller can split a document into requests
that stay within the limit without copying the packing rule out of the README; it
never splits a segment, and a segment longer than the limit keeps its own chunk
so the call fails with the `413` result instead of the segment being dropped.
The library still sends exactly one request per call — the number of requests
stays the caller's decision.

The CLI is aligned on top of it: `--text` and `--file` are repeatable, every
value is a segment of one batch, and `deeplx` chunks those segments by total
length, so one invocation translates a whole document in as few requests as the
limit allows and prints one translation per segment, in order.
`--concurrency <count>` sends up to that many chunks at once, one at a time by
default, because the endpoint rate-limits bursts. The all-in-one `deeplx`
package re-exports the library and the CLI, so it carries the same feature with
a matching bump.
