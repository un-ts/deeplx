---
"@deeplx/core": patch
---

fix: align the oneshot client with the DeepL iOS request profile

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
