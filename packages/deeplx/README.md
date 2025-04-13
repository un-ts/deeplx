# DeepLX

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/un-ts/deeplx/ci.yml?branch=master)](https://github.com/un-ts/deeplx/actions/workflows/ci.yml?query=branch%3Amaster)
[![Codecov](https://img.shields.io/codecov/c/github/un-ts/deeplx.svg)](https://codecov.io/gh/un-ts/deeplx)
[![Codacy Grade](https://img.shields.io/codacy/grade/e3d752491a664d889c5bdfb6ffeb6cbb)](https://app.codacy.com/gh/un-ts/deeplx)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Frx-ts%2Fdeeplx%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/un-ts/deeplx)](https://coderabbit.ai)
[![npm](https://img.shields.io/npm/v/deeplx.svg)](https://www.npmjs.com/package/deeplx)
[![GitHub Release](https://img.shields.io/github/release/un-ts/deeplx)](https://github.com/un-ts/deeplx/releases)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![changesets](https://img.shields.io/badge/maintained%20with-changesets-176de3.svg)](https://github.com/atlassian/changesets)

All in one for [`@deeplx/core`](https://github.com/un-ts/deeplx/blob/master/packages/@deeplx/core) and [`@deeplx/cli`](https://github.com/un-ts/deeplx/blob/master/packages/@deeplx/cli), a powerful and easy-to-use yet free DeepL API client for Node.js using [DeepL](https://www.deepl.com) by porting [OwO-Network/DeepLX](https://github.com/OwO-Network/DeepLX).

## TOC <!-- omit in toc -->

- [Online Service](#online-service)
- [Installation](#installation)
- [Usage](#usage)
  - [Supported languages](#supported-languages)
  - [Command line tool](#command-line-tool)
    - [Help](#help)
    - [Example 1](#example-1)
    - [Example 2](#example-2)
    - [Example 3](#example-3)
    - [Example 4](#example-4)
  - [Node library](#node-library)
    - [Example 1](#example-1-1)
    - [Example 2](#example-2-1)
- [Sponsors and Backers](#sponsors-and-backers)
  - [Sponsors](#sponsors)
  - [Backers](#backers)
- [Changelog](#changelog)
- [License](#license)

## Online Service

<https://deeplx.vercel.app/translate>

## Installation

```sh
# npm
npm i deeplx

# pnpm
pnpm add deeplx

# yarn
yarn add deeplx

# or install `@deeplx/core` for only API usage, or install `@deeplx/cli` for only CLI usage
```

## Usage

### Supported languages

Currently the following languages are supported:

| Abbreviation | Language   | Writing in own language |
| ------------ | ---------- | ----------------------- |
| BG           | Bulgarian  | Български               |
| ZH           | Chinese    | 中文                    |
| CS           | Czech      | Česky                   |
| DA           | Danish     | Dansk                   |
| NL           | Dutch      | Nederlands              |
| EN           | English    | English                 |
| ET           | Estonian   | Eesti                   |
| FI           | Finnish    | Suomi                   |
| FR           | French     | Français                |
| DE           | German     | Deutsch                 |
| EL           | Greek      | Ελληνικά                |
| HU           | Hungarian  | Magyar                  |
| IT           | Italian    | Italiano                |
| JA           | Japanese   | 日本語                  |
| LV           | Latvian    | Latviešu                |
| LT           | Lithuanian | Lietuvių                |
| PL           | Polish     | Polski                  |
| PT           | Portuguese | Português               |
| RO           | Romanian   | Română                  |
| RU           | Russian    | Русский                 |
| SK           | Slovak     | Slovenčina              |
| SL           | Slovenian  | Slovenščina             |
| ES           | Spanish    | Español                 |
| SV           | Swedish    | Svenska                 |
| UK           | Ukrainian  | Українська Мова         |

You can either input the abbreviation or the language written in english.

### Command line tool

#### Help

```sh
deeplx -h
```

```console
Usage: deeplx [options]

An unofficial Node package to translate text using [DeepL](https://www.deepl.com) by porting [OwO-Network/DeepLX](https://github.com/OwO-Network/DeepLX).

Options:
  -V, --version        output the version number
  -s, --source <text>  Source language of your text
  -t, --target <text>  Target language of your desired text
  --text <text>        Text to be translated
  -f, --file <path>    File to be translated
  --formal [boolean]   Whether to use formal (true) or informal (false) tone in translation. Default `undefined` respects source text tone.
  --no-formal
  -h, --help           display help for command
```

#### Example 1

This will translate a Spanish (`ES`) text into Russian (`RU`):

```sh
deeplx -t russian --text "¡Buenos días!"
```

```text
Доброе утро!
```

#### Example 2

This will translate the file (`test.txt`) text from Italian (`IT`) into Portuguese (`PT`):

```sh
deeplx -t PT -f test.txt
```

#### Example 3

This will translate a Spanish (`ES`) text into Russian (`RU`) in _formal_ tone:

```sh
deeplx -t RU --text "¿Cómo te llamas?" --formal
```

```text
Как Вас зовут?
```

Note: _informal_ would be "_Как **тебя** зовут?_"

#### Example 4

This will translate a Japanese (`JA`) text into German (`DE`) in _informal_ tone:

```sh
deeplx -t DE --text "お元気ですか？" --no-formal
```

```text
Wie geht es dir?
```

Note: _formal_ would be "_Wie geht es **Ihnen**?_"

### Node library

#### Example 1

This will translate a Chinese (`ZH`) text into Dutch (`NL`):

```js
import { translate } from 'deeplx'

await translate('你好', 'NL')
```

```log
'Hallo'
```

#### Example 2

This will translate a `danish` text into `german` in informal tone:

```js
import { translate } from 'deeplx'

await translate('Ring til mig!', 'german', 'danish', false)
```

```log
'Ruf mich an!'
```

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
