---
"@deeplx/core": major
"@deeplx/cli": major
"deeplx": major
---

feat!: migrate to oneshot API, refactor language mapping, and drop formal support

- **Breaking:** Removed `formal` parameter from the `translate` function and `--formal` from CLI.
- **Breaking:** Migrated the backend to DeepL's undocumented `oneshot` API to mitigate aggressive 429/403 blocking on the legacy `/jsonrpc` endpoint.
- **Feature:** Added support for configuring a DeepL Pro `dlSession` cookie and a `proxyUrl` across the core API, CLI, and Vercel endpoints.
- **Feature:** Refactored language code resolution to natively support regional variants (e.g., `ZH-HANT`) via statically defined maps while retaining backward compatibility for loose inputs.
