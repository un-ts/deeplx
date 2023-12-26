# DeepL Translate

[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/un-ts/deeplx/ci.yml)](https://github.com/un-ts/deeplx/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/github/un-ts/deeplx.svg)](https://codecov.io/gh/un-ts/deeplx)
[![Codacy Grade](https://img.shields.io/codacy/grade/e3d752491a664d889c5bdfb6ffeb6cbb)](https://app.codacy.com/gh/un-ts/deeplx)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Frx-ts%2Fdeeplx%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![npm](https://img.shields.io/npm/v/deeplx.svg)](https://www.npmjs.com/package/deeplx)
[![GitHub Release](https://img.shields.io/github/release/un-ts/deeplx)](https://github.com/un-ts/deeplx/releases)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![changesets](https://img.shields.io/badge/maintained%20with-changesets-176de3.svg)](https://github.com/atlassian/changesets)

An unofficial Node package to translate text using [DeepL](https://www.deepl.com).

## Deploy

### Deploy With Vercel(Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/un-ts/deeplx)

Just click the button above and follow the instructions to deploy your own copy of the app.

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

You can either input the abbreviation or the language written in english.

### Command line tool

#### Help

```sh
deeplx --help
```

```log
Usage: deeplx [options]

An unofficial Node package to translate text using [DeepL](https://www.deeplx.com).

Options:
  -V, --version                  output the version number
  -sl, --source-language <text>  Source language of your text
  -tl, --target-language <text>  Target language of your desired text
  --formal                       Use formal or informal tone in translation (default: false)
  -t, --text                     Text to be translated
  -f, --file                     File to be translated
  -h, --help                     display help for command
```

#### Example 1

This will translate a Spanish (`ES`) text into Russian (`RU`):

```sh
deeplx -tl russian -t "¡Buenos días!"
```

```plain
Доброе утро!
```

#### Example 2

This will translate the file (`test.txt`) text from Italian (`IT`) into Portuguese (`PT`):

```sh
deeplx -tl PT -f test.txt
```

#### Example 3

This will translate a Spanish (`ES`) text into Russian (`RU`) in _formal_ tone:

```sh
deeplx -tl RU --text "¿Cómo te llamas?" --formal
```

```plain
Как Вас зовут?
```

Note: _informal_ would be "_Как **тебя** зовут?_"

#### Example 4

This will translate a Japanese (`JP`) text into German (`DE`) in _informal_ tone:

```sh
deeplx -tl DE --text "お元気ですか？" --formal false
```

```plain
Wie geht es dir?
```

Note: _formal_ would be "_Wie geht es **Ihnen**?_"

### Node library

#### Example 1

This will translate a Chinese (`ZH`) text into Dutch (`NL`):

```js
import { translate } from 'deeplx'

translate('你好', 'NL')
```

```log
'Hallo'
```

#### Example 2

This will translate a `danish` text into `german` in informal tone:

```js
import { translate } from 'deeplx'

translate('Ring til mig!', 'german', 'danish', undefined, undefined, false)
```

```log
'Ruf mich an!'
```
