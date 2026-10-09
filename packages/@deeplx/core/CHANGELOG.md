# @deeplx/core

## 0.2.5

### Patch Changes

- [#63](https://github.com/un-ts/deeplx/pull/63) [`b5de5c1`](https://github.com/un-ts/deeplx/commit/b5de5c15b07ded1998a57c8530f93c7e97bcf2f5) Thanks [@renovate](https://github.com/apps/renovate)! - fix: update `x-fetch` to `0.3` and migrate the oneshot error handling

  `x-fetch@0.3` replaces `ResponseError` with `XFetchError` plus the
  `isXFetchError` type guard, so `parseTranslationError` now narrows through that
  guard instead of `instanceof`.

  The same class also wraps transport failures and bodies that cannot be parsed,
  so only a response with an error status is treated as a DeepL status; an `ok`
  response can never be reported as a successful translation. The observable
  behaviour of the `403` (with `title`/`message` detail), `429` and other-status
  branches is unchanged.

## 0.2.4

### Patch Changes

- [#71](https://github.com/un-ts/deeplx/pull/71) [`8272a4d`](https://github.com/un-ts/deeplx/commit/8272a4d9cb635a222410faa580959a3f5c5dbe99) Thanks [@JounQin](https://github.com/JounQin)! - fix: send the generic `zh` as the Chinese `source_lang`

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

## 0.2.3

### Patch Changes

- [#70](https://github.com/un-ts/deeplx/pull/70) [`b974208`](https://github.com/un-ts/deeplx/commit/b97420824c90519cb26f6c98ebc25fbf085ef524) Thanks [@JounQin](https://github.com/JounQin)! - fix: align the oneshot client with the DeepL iOS request profile

  The anonymous oneshot request now mirrors the official DeepL iOS app, matching
  the reverse engineering in OwO-Network/DLX:

  - The iOS `User-Agent` (`DeepL/26.42 CFNetwork/3826.600.41 Darwin/25.0.0`) and
    the three `ClientInfos.appHeaders` keys (`x-app-os-version`,
    `x-app-instance-id`, `x-app-session-id`) replace the Chrome-extension profile
    (`Origin: chrome-extension://…`, the `Sec-Fetch-*` set and the Chrome UA).
  - `app_information` reports the iOS app (`os: "iOS"`, `os_version: "26.0"`,
    `app_version: "26.42"`, `app_build: "5443737"`) and `usage_type` is the
    lower-case `"translate"`, exactly as the iOS client serializes it.
  - New exports `IOS_APP_VERSION`, `IOS_APP_BUILD`, `IOS_OS_VERSION`,
    `IOS_CFNETWORK_VERSION`, `IOS_DARWIN_VERSION` and `HTTP_STATUS_FORBIDDEN`; the
    Chrome-extension constants are deprecated but still exported so the public
    surface does not break.
  - An HTTP 403 from DeepL is surfaced with the upstream `title`/`message` detail
    instead of a bare status text.

  The iOS TLS ClientHello (utls `HelloIOS_Auto` upstream) cannot be reproduced on
  `fetch`, so the runtime's own TLS stack is used and only the HTTP profile is
  aligned.

- [#68](https://github.com/un-ts/deeplx/pull/68) [`830ff11`](https://github.com/un-ts/deeplx/commit/830ff111d5cd641f8ad7d4d0836a6d71a8a78b58) Thanks [@JounQin](https://github.com/JounQin)! - fix: read `Set-Cookie` through `getSetCookie()` when available

  `Headers.getSetCookie()` is the accessor the current Fetch spec requires, and a
  runtime that hides `Set-Cookie` from `headers.get()` must provide it. Reading the
  warm-up cookies through it parses each `Set-Cookie` separately instead of
  depending on comma-joined concatenation, so we no longer rely on the non-standard
  `get('set-cookie')` behaviour of some runtimes.

  Measured on workerd 1.20260625.1: `get('set-cookie')` returns a joined string
  (not `null`) at every compatibility date tried, `getSetCookie()` is enabled by the
  `http_headers_getsetcookie` compatibility flag and on by default from
  compatibility date `2023-03-01` (undefined at `2023-02-01`, present at
  `2023-03-01`), and Workers' own `getAll('set-cookie')` also exists -- Cloudflare's
  docs are stale here. workerd behaviour is therefore unchanged by this patch: it is
  a portability and robustness fix, **not** a fix for the reported "silent echo",
  which is DeepL answering `200` with the input text whenever it declines to
  translate.

## 0.2.2

### Patch Changes

- [#56](https://github.com/un-ts/deeplx/pull/56) [`3305517`](https://github.com/un-ts/deeplx/commit/33055171a65504b851341cedcbfd14dd08d34ea9) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - feat: optimize warmCookies for ephemeral environments

## 0.2.1

### Patch Changes

- [#52](https://github.com/un-ts/deeplx/pull/52) [`8b3ef08`](https://github.com/un-ts/deeplx/commit/8b3ef08bc76c8a9d77a22bb831b762bdb6840144) Thanks [@maxchang3](https://github.com/maxchang3)! - feat: support `AbortSignal` in translate to allow cancellation of upstream requests

## 0.2.0

### Minor Changes

- [#48](https://github.com/un-ts/deeplx/pull/48) [`f9c6651`](https://github.com/un-ts/deeplx/commit/f9c66519a26d7ac326d40b4c6012b3e30c8e31cf) Thanks [@maxchang3](https://github.com/maxchang3)! - feat!: migrate to oneshot API, refactor language mapping, and drop formal support

  - **Breaking:** Removed `formal` parameter from the `translate` function and `--formal` from CLI.
  - **Breaking:** Migrated the backend to DeepL's undocumented `oneshot` API to mitigate aggressive 429/403 blocking on the legacy `/jsonrpc` endpoint.
  - **Feature:** Added support for configuring a DeepL Pro `dlSession` cookie and a `proxyUrl` across the core API, CLI, and Vercel endpoints.
  - **Feature:** Refactored language code resolution to natively support regional variants (e.g., `ZH-HANT`) via statically defined maps while retaining backward compatibility for loose inputs.

## 0.1.3

### Patch Changes

- [#40](https://github.com/un-ts/deeplx/pull/40) [`65855bf`](https://github.com/un-ts/deeplx/commit/65855bfc65eebce31efb823064495f386c3d87cb) Thanks [@JounQin](https://github.com/JounQin)! - feat: add `proxy` support with `node-fetch-native/proxy`

## 0.1.2

### Patch Changes

- [`f3493cc`](https://github.com/un-ts/deeplx/commit/f3493cc7224c5cb0e6f3eec1d15ef7ffb3c9241a) Thanks [@JounQin](https://github.com/JounQin)! - fix: remove invalid `bin` field for `@deeplx/core`

## 0.1.1

### Patch Changes

- [#35](https://github.com/un-ts/deeplx/pull/35) [`7818273`](https://github.com/un-ts/deeplx/commit/781827308f0487f26b5162d8fec9148b96f1b876) Thanks [@JounQin](https://github.com/JounQin)! - docs: improve accessibility with `TOC`

## 0.1.0

### Minor Changes

- [#31](https://github.com/un-ts/deeplx/pull/31) [`fd636c5`](https://github.com/un-ts/deeplx/commit/fd636c590b2255a9f657ac43a400bfdff66af5a6) Thanks [@JounQin](https://github.com/JounQin)! - feat: split into `@deeplx/core` and `@deeplx/cli`
