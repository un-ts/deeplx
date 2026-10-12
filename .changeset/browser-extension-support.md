---
"@deeplx/core": patch
---

`randomUUID` now resolves per platform — `node:crypto` on Node, the Web Crypto
API in a browser, where `browser` in `package.json` maps `random.ts` to its
browser twin — so a browser bundle builds while every Node version the package
declares keeps the UUID source it had. A browser extension with host permissions
for the endpoint can use the library; a web page still cannot call the endpoint
directly, because it does not answer CORS for one. A test bundles for
`platform: browser` and fails if a `node:` import or the wrong twin shows up.
