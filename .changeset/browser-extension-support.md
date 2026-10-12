---
"@deeplx/core": patch
---

`randomUUID` now comes from the Web Crypto API (`globalThis.crypto`) instead of
`node:crypto`, so the library has no Node built-ins left and a browser bundle
builds — a browser extension with host permissions for the endpoint can use it,
and a test fails if a `node:` import ever comes back. A web page still cannot
call the endpoint directly, because it does not answer CORS for one.
