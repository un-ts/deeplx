---
"@deeplx/core": patch
---

`randomUUID` now has a source per platform: `node:crypto` on Node, and the Web
Crypto API in a browser, where `browser` in `package.json` maps the built
`random.js` to its browser twin as a bundler resolves the package through
`exports`. Every Node version the package declares keeps the UUID source it had,
and a browser bundle now builds, so a browser extension with host permissions for
the endpoint can use the library — a web page still cannot call it directly,
because the endpoint does not answer CORS for one. A test bundles the published
entry by package name for `platform: browser` and fails if `node:crypto` reaches
the output.
