# @deeplx/core

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
