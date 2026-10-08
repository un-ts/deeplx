---
"@deeplx/core": patch
---

fix: read `Set-Cookie` through `getSetCookie()` when available

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
