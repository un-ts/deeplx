# @deeplx/core

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/un-ts/deeplx/ci.yml?branch=master)](https://github.com/un-ts/deeplx/actions/workflows/ci.yml?query=branch%3Amaster)
[![Codecov](https://img.shields.io/codecov/c/github/un-ts/deeplx.svg)](https://codecov.io/gh/un-ts/deeplx)
[![Codacy Grade](https://img.shields.io/codacy/grade/e3d752491a664d889c5bdfb6ffeb6cbb)](https://app.codacy.com/gh/un-ts/deeplx)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Frx-ts%2Fdeeplx%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/un-ts/deeplx)](https://coderabbit.ai)
[![npm](https://img.shields.io/npm/v/@deeplx/core.svg)](https://www.npmjs.com/package/@deeplx/core)
[![GitHub Release](https://img.shields.io/github/release/un-ts/deeplx)](https://github.com/un-ts/deeplx/releases)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![changesets](https://img.shields.io/badge/maintained%20with-changesets-176de3.svg)](https://github.com/atlassian/changesets)

An unofficial but powerful and easy-to-use yet free DeepL API client for Node.js using [DeepL](https://www.deepl.com) by porting [OwO-Network/DeepLX](https://github.com/OwO-Network/DeepLX).

## TOC <!-- omit in toc -->

- [Online Service](#online-service)
- [Installation](#installation)
- [Usage](#usage)
  - [Supported languages](#supported-languages)
  - [Example 1](#example-1)
  - [Example 2](#example-2)
  - [Example 3](#example-3)
  - [Batch translation](#batch-translation)
- [Browser and browser extensions](#browser-and-browser-extensions)
- [Sponsors and Backers](#sponsors-and-backers)
  - [Sponsors](#sponsors)
  - [Backers](#backers)
- [Changelog](#changelog)
- [License](#license)

## Online Service

<https://deeplx.1stg.me/translate>

## Installation

```sh
# npm
npm i @deeplx/core

# pnpm
pnpm add @deeplx/core

# yarn
yarn add @deeplx/core
```

## Usage

### Supported languages

Currently the following languages are supported:

| Abbreviation | Language                 | Writing in own language |
| ------------ | ------------------------ | ----------------------- |
| AR           | Arabic                   | العربية                 |
| BG           | Bulgarian                | Български               |
| CS           | Czech                    | Česky                   |
| DA           | Danish                   | Dansk                   |
| DE           | German                   | Deutsch                 |
| EL           | Greek                    | Ελληνικά                |
| EN           | English                  | English                 |
| EN-GB        | English (British)        | English (British)       |
| EN-US        | English (American)       | English (American)      |
| ES           | Spanish                  | Español                 |
| ES-419       | Spanish (Latin American) | Español (Latinoamérica) |
| ET           | Estonian                 | Eesti                   |
| FI           | Finnish                  | Suomi                   |
| FR           | French                   | Français                |
| HE           | Hebrew                   | עברית                   |
| HU           | Hungarian                | Magyar                  |
| ID           | Indonesian               | Bahasa Indonesia        |
| IT           | Italian                  | Italiano                |
| JA           | Japanese                 | 日本語                  |
| KO           | Korean                   | 한국어                  |
| LT           | Lithuanian               | Lietuvių                |
| LV           | Latvian                  | Latviešu                |
| NB           | Norwegian Bokmål         | Norsk bokmål            |
| NL           | Dutch                    | Nederlands              |
| PL           | Polish                   | Polski                  |
| PT           | Portuguese               | Português               |
| PT-BR        | Portuguese (Brazilian)   | Português (Brasil)      |
| PT-PT        | Portuguese (European)    | Português (Portugal)    |
| RO           | Romanian                 | Română                  |
| RU           | Russian                  | Русский                 |
| SK           | Slovak                   | Slovenčina              |
| SL           | Slovenian                | Slovenščina             |
| SV           | Swedish                  | Svenska                 |
| TR           | Turkish                  | Türkçe                  |
| UK           | Ukrainian                | Українська Мова         |
| VI           | Vietnamese               | Tiếng Việt              |
| ZH           | Chinese                  | 中文                    |
| ZH-HANS      | Chinese (Simplified)     | 简体中文                |
| ZH-HANT      | Chinese (Traditional)    | 繁体中文                |

You can either input the abbreviation or the language written in english.

### Example 1

This will translate a Chinese (`ZH`) text into Dutch (`NL`):

```js
import { translate } from '@deeplx/core'

await translate('你好', 'NL')
```

```log
'Hallo'
```

### Example 2

This will translate a `danish` text into `german`:

```js
import { translate } from '@deeplx/core'

await translate('Ring til mig!', 'german', 'danish')
```

```log
'Ruf mich an!'
```

### Example 3

This will translate a text using a proxy and a DeepL Pro session cookie:

```js
import { translate } from '@deeplx/core'

await translate('Hello World', 'ZH', 'EN', {
  proxyUrl: 'http://127.0.0.1:7890',
  dlSession: 'your_dl_session_cookie',
})
```

```log
'你好，世界'
```

### Batch translation

`translate` accepts `string | readonly string[]`, as does `translateByDeepLX`
(which additionally returns the whole result). An array is sent as a single
oneshot request whose `text` is that array, and one translation comes back per
requested text, in the same order — so a document of `n` segments costs one
request instead of `n`:

```js
import { translate } from '@deeplx/core'

const data = await translate(['Hello world', 'How are you?'], 'ZH', 'EN')

// data[i] is the translation of the i-th input text:
// ['你好，世界', '你好吗？']
```

A string argument resolves to a `string` instead of an array; when it carries
text, the request body and the response fields are the same as before.

#### Chunk by total length, not by segment count

The anonymous oneshot endpoint caps the **sum** of all `text` items at 1500
characters, counted in **UTF-16 code units** — `String.prototype.length`, so a
CJK character costs 1 and an astral emoji costs 2 — and answers `400` when a
request exceeds it. Both helpers validate this before sending:
`translateByDeepLX` resolves to the existing `413` error result and `translate`
throws it. `chunkByLength` packs segments into requests that stay within it:

```js
import { chunkByLength, translate } from '@deeplx/core'

for (const chunk of chunkByLength(document.split('\n'))) {
  const data = await translate(chunk, 'ZH', 'EN')
  // one translation per segment, in the same order; empty lines stay empty
}
```

It never splits a segment, and a segment longer than the limit keeps its own
chunk, so the call fails with the `413` result instead of silently dropping it.
The library still sends exactly one request per call: the number of requests
stays the caller's decision.

#### Emptiness is not an error

Every position is answered: a text that carries something is translated, and a
blank text (empty or whitespace-only) is returned exactly as it arrived without
being sent. A document split into lines therefore keeps its blank lines, an empty
array is answered with an empty array, and a blank string with that same string —
the endpoint is never asked about a request that has nothing to translate. This
mirrors the server-side `/translate`.

A request that names no text is refused instead: `null`, `undefined`, a wrong
type, or a list holding something that is not a string — a `null` element
included, as the server-side decoder rejects it. `translateByDeepLX` resolves to
the same `400 Invalid request payload` the server-side `/translate` answers, and
`translate` throws an `Error` carrying that result as its `cause`. An empty
string is a perfectly good text, and so is an empty list.

The one failure left is a response that does not line up with the texts that were
sent: a `translations` array that is shorter, longer or missing throws a count
mismatch `Error` carrying the library's error result as its `cause`, instead of
returning misaligned data. Transport and endpoint errors are still returned as
error results by `translateByDeepLX`, and thrown as an `Error` by `translate`,
exactly as before.

## Browser and browser extensions

The library imports no Node built-ins, so it bundles for the browser — a test
here builds the published entry with `vite` — but bundling is not the same as
being allowed to call the endpoint. That call works from a **browser
extension**: with host permissions for `https://oneshot-free.www.deepl.com/*`
(and `https://oneshot-pro.www.deepl.com/*` for a Pro session) the extension's own
requests are not subject to CORS. That covers the extension's pages and its
background service worker; a content script keeps the page's restrictions, and
so does a web page's own service worker — a service worker is not a way around
CORS. Relay the call to the extension's service worker with
`chrome.runtime.sendMessage` rather than calling `translate` from a content
script.

The real thing is covered as well: `yarn test:e2e` builds the published entry
into an unpacked MV3 extension, loads it into a real Chrome, and lets its service
worker make this call. `DEEPLX_CHROME_PATH` (or `CHROME_PATH`/`CHROME_BIN`)
points at the binary, and without one the test skips rather than fails. It stays
out of `yarn test` because it needs both a browser and the network.

A web page cannot call the endpoint at all: it answers a preflight without
`Access-Control-Allow-Origin`, so the browser blocks the request before it is
sent; and `User-Agent`, `Accept-Encoding` and `Cookie` are forbidden headers that
the browser fills in itself, so the iOS profile could not travel from a page
either. Send the call through your own server or Worker
instead — this repository's `worker.ts` answers `Access-Control-Allow-Origin: *`
for exactly that.

Three things work differently inside a browser:

- **Cookies are the extension's job, not the library's.** `Set-Cookie` is a
  forbidden response header, so the warm-up that reads it in Node cannot work
  here, and `Cookie` is a forbidden request header, so the `cookies` option
  cannot either — only the browser's own jar can send them. There is nothing for
  the library to support natively: `chrome.cookies` and the manifest are the only
  tools. An extension can warm the jar the way the library does in Node, because
  its host permissions put it outside CORS:

  ```js
  // What the Node warm-up does: fetching the site makes the browser store the
  // cookies it sets, even though JavaScript cannot read `Set-Cookie` itself.
  await fetch('https://www.deepl.com/translator', { credentials: 'include' })

  // Or copy what the jar already holds for the site onto the endpoint's host.
  const [cookie] = await chrome.cookies.getAll({ domain: 'www.deepl.com' })
  if (cookie) {
    await chrome.cookies.set({
      url: 'https://oneshot-free.www.deepl.com/',
      name: cookie.name,
      value: cookie.value,
    })
  }

  // `translate` is the public entry point, and it throws on an error result.
  const translated = await translate('Hallo', 'EN', 'DE', { skipWarm: true })
  ```

  Nothing in the library requires cookies — the warm-up is what fetches them —
  so `skipWarm: true` is the honest setting in a browser.

- **`User-Agent` and `Accept-Encoding` travel as the browser's own values, not
  the iOS profile's.** They are forbidden request header names: no `fetch` option
  and no library API can set them, and the browser fills in its own instead, so
  an extension goes out as a browser request — the same profile the DeepL
  extension itself uses. Only a `declarativeNetRequest` rule can substitute the
  iOS values. Both APIs need their own manifest entries:

  ```json
  {
    "host_permissions": [
      "https://www.deepl.com/*",
      "https://oneshot-free.www.deepl.com/*",
      "https://oneshot-pro.www.deepl.com/*"
    ],
    "permissions": ["cookies", "declarativeNetRequestWithHostAccess"]
  }
  ```

  `www.deepl.com` is in there because warming the jar — the `fetch` of the site,
  or `chrome.cookies.getAll` — needs it for the same reason the endpoint's hosts
  do: without the permission that request is cross-origin again.

  A rule can substitute the iOS `User-Agent` for the extension's own requests, as
  `set` rather than `append` — Chrome only allows `append` for [a short list of
  headers](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ModifyHeaderInfo)
  that `User-Agent` is not on. The value is the one this package pins in
  `constants.ts`, built there from `IOS_APP_VERSION`, `IOS_CFNETWORK_VERSION`
  and `IOS_DARWIN_VERSION`, and it only makes sense next to the `app_information`
  the library sends in the body — which is why both live in the same module:

  ```js
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'user-agent', operation: 'set', value: iosUserAgent },
          ],
        },
        condition: {
          // Only this extension's own requests, so the rest of the browser keeps
          // its own profile.
          initiatorDomains: [chrome.runtime.id],
          requestDomains: [
            'oneshot-free.www.deepl.com',
            'oneshot-pro.www.deepl.com',
          ],
          resourceTypes: ['xmlhttprequest'],
        },
      },
    ],
  })
  ```

  Even then the request is not the iOS app's: the TLS fingerprint is still the
  browser's, and the note in `constants.ts` is that DeepL rate-limits clients whose
  fingerprint, `User-Agent` and `app_information` disagree. Treat a spoofed
  `User-Agent` as an experiment — the browser profile is what the DeepL extension
  itself uses.

- **`proxyUrl` is Node-only**: in a browser `node-fetch-native`'s proxy module
  is a no-op stub, so the option is ignored rather than throwing.

## Sponsors and Backers

[![Sponsors and Backers](https://raw.githubusercontent.com/1stG/static/master/sponsors.svg)](https://github.com/sponsors/JounQin)

### Sponsors

| 1stG                                                                                                                   | RxTS                                                                                                                   | UnTS                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective sponsors](https://opencollective.com/1stG/organizations.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective sponsors](https://opencollective.com/rxts/organizations.svg)](https://opencollective.com/rxts) | [![UnTS Open Collective sponsors](https://opencollective.com/unts/organizations.svg)](https://opencollective.com/unts) |

### Backers

| 1stG                                                                                                                | RxTS                                                                                                                | UnTS                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective backers](https://opencollective.com/1stG/individuals.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective backers](https://opencollective.com/rxts/individuals.svg)](https://opencollective.com/rxts) | [![UnTS Open Collective backers](https://opencollective.com/unts/individuals.svg)](https://opencollective.com/unts) |

## Changelog

Detailed changes for each release are documented in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT][] © [JounQin][]@[1stG.me][]

[1stG.me]: https://www.1stG.me
[JounQin]: https://github.com/JounQin
[MIT]: http://opensource.org/licenses/MIT
