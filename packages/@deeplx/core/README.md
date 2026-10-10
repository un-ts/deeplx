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
type, or a list holding something that is not a string resolves to the server's
`400 Invalid request payload`. A `null` or missing element _inside_ a list is not
that case — the server-side JSON decoder leaves the empty string for it, and so
does this client.

The one failure left is a response that does not line up with the texts that were
sent: a `translations` array that is shorter, longer or missing throws a count
mismatch `Error` carrying the library's error result as its `cause`, instead of
returning misaligned data. Transport and endpoint errors are still returned as
error results by `translateByDeepLX`, and thrown as an `Error` by `translate`,
exactly as before.

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
