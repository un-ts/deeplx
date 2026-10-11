# @deeplx/cli

## 0.3.0

### Minor Changes

- [#76](https://github.com/un-ts/deeplx/pull/76) [`1c60b69`](https://github.com/un-ts/deeplx/commit/1c60b69a3ab4b8be911758a168f138ee11e7ae88) Thanks [@JounQin](https://github.com/JounQin)! - feat: translate many texts in a single oneshot request

  `translate` and `translateByDeepLX` now accept `text: string | readonly
string[]`. An array is sent as one oneshot request whose `text` is that array:
  `translate` resolves to a position-aligned `string[]`, and `translateByDeepLX`
  to a `DeepLXTranslationResult<string[]>`. A non-blank string argument keeps the
  previous request, response and error shapes exactly; a blank one is answered with
  itself, as below.

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
  wrong type, or a list holding something other than a string, a `null` element
  included — is refused with the same `400 Invalid request payload` the
  server-side `/translate` answers: `translateByDeepLX` resolves to that result and
  `translate` throws it, while an empty string is a text like any other. The
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

### Patch Changes

- Updated dependencies [[`1c60b69`](https://github.com/un-ts/deeplx/commit/1c60b69a3ab4b8be911758a168f138ee11e7ae88)]:
  - @deeplx/core@0.3.0

## 0.2.1

### Patch Changes

- [#56](https://github.com/un-ts/deeplx/pull/56) [`3305517`](https://github.com/un-ts/deeplx/commit/33055171a65504b851341cedcbfd14dd08d34ea9) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - feat: optimize warmCookies for ephemeral environments

- Updated dependencies [[`3305517`](https://github.com/un-ts/deeplx/commit/33055171a65504b851341cedcbfd14dd08d34ea9)]:
  - @deeplx/core@0.2.2

## 0.2.0

### Minor Changes

- [#48](https://github.com/un-ts/deeplx/pull/48) [`f9c6651`](https://github.com/un-ts/deeplx/commit/f9c66519a26d7ac326d40b4c6012b3e30c8e31cf) Thanks [@maxchang3](https://github.com/maxchang3)! - feat!: migrate to oneshot API, refactor language mapping, and drop formal support

  - **Breaking:** Removed `formal` parameter from the `translate` function and `--formal` from CLI.
  - **Breaking:** Migrated the backend to DeepL's undocumented `oneshot` API to mitigate aggressive 429/403 blocking on the legacy `/jsonrpc` endpoint.
  - **Feature:** Added support for configuring a DeepL Pro `dlSession` cookie and a `proxyUrl` across the core API, CLI, and Vercel endpoints.
  - **Feature:** Refactored language code resolution to natively support regional variants (e.g., `ZH-HANT`) via statically defined maps while retaining backward compatibility for loose inputs.

### Patch Changes

- Updated dependencies [[`f9c6651`](https://github.com/un-ts/deeplx/commit/f9c66519a26d7ac326d40b4c6012b3e30c8e31cf)]:
  - @deeplx/core@0.2.0

## 0.1.3

### Patch Changes

- [#40](https://github.com/un-ts/deeplx/pull/40) [`65855bf`](https://github.com/un-ts/deeplx/commit/65855bfc65eebce31efb823064495f386c3d87cb) Thanks [@JounQin](https://github.com/JounQin)! - feat: add `proxy` support with `node-fetch-native/proxy`

- Updated dependencies [[`65855bf`](https://github.com/un-ts/deeplx/commit/65855bfc65eebce31efb823064495f386c3d87cb)]:
  - @deeplx/core@0.1.3

## 0.1.2

### Patch Changes

- [#35](https://github.com/un-ts/deeplx/pull/35) [`7818273`](https://github.com/un-ts/deeplx/commit/781827308f0487f26b5162d8fec9148b96f1b876) Thanks [@JounQin](https://github.com/JounQin)! - docs: improve accessibility with `TOC`

- Updated dependencies [[`7818273`](https://github.com/un-ts/deeplx/commit/781827308f0487f26b5162d8fec9148b96f1b876)]:
  - @deeplx/core@0.1.1

## 0.1.1

### Patch Changes

- [#33](https://github.com/un-ts/deeplx/pull/33) [`39201f0`](https://github.com/un-ts/deeplx/commit/39201f0992aac2a2c2265eafb79cb3e9380475b7) Thanks [@JounQin](https://github.com/JounQin)! - fix: use static consistent cli name

## 0.1.0

### Minor Changes

- [#31](https://github.com/un-ts/deeplx/pull/31) [`fd636c5`](https://github.com/un-ts/deeplx/commit/fd636c590b2255a9f657ac43a400bfdff66af5a6) Thanks [@JounQin](https://github.com/JounQin)! - feat: split into `@deeplx/core` and `@deeplx/cli`

### Patch Changes

- Updated dependencies [[`fd636c5`](https://github.com/un-ts/deeplx/commit/fd636c590b2255a9f657ac43a400bfdff66af5a6)]:
  - @deeplx/core@0.1.0
