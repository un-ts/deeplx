# DeepL Translate

[![GitHub Actions](https://github.com/rx-ts/deepl-translate/workflows/CI/badge.svg)](https://github.com/rx-ts/deepl-translate/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/github/rx-ts/deepl-translate.svg)](https://codecov.io/gh/rx-ts/deepl-translate)
[![Codacy Grade](https://img.shields.io/codacy/grade/1d00ac27c99d4412bb70211e258706ab)](https://app.codacy.com/gh/rx-ts/deepl-translate)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Frx-ts%2Fdeepl-translate%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![npm](https://img.shields.io/npm/v/deepl-translate.svg)](https://www.npmjs.com/package/deepl-translate)
[![GitHub Release](https://img.shields.io/github/release/rx-ts/deepl-translate)](https://github.com/rx-ts/deepl-translate/releases)

[![David Peer](https://img.shields.io/david/peer/rx-ts/deepl-translate.svg)](https://david-dm.org/rx-ts/deepl-translate?type=peer)
[![David](https://img.shields.io/david/rx-ts/deepl-translate.svg)](https://david-dm.org/rx-ts/deepl-translate)
[![David Dev](https://img.shields.io/david/dev/rx-ts/deepl-translate.svg)](https://david-dm.org/rx-ts/deepl-translate?type=dev)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![changesets](https://img.shields.io/badge/maintained%20with-changesets-176de3.svg)](https://github.com/atlassian/changesets)

An unofficial Node package to translate text using [DeepL](https://www.deepl.com).

## Installation

```sh
# npm
npm i deepl-translate

# pnpm
pnpm add deepl-translate

# yarn
yarn add deepl-translate
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
deepl --help
```

```log
Usage: deepl [options]

An unofficial Node package to translate text using [DeepL](https://www.deepl.com).

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
deepl -sl spanish -tl russian -t "¡Buenos días!"
```

```plain
Доброе утро!
```

#### Example 2

This will translate the file (`test.txt`) text from Italian (`IT`) into Portuguese (`PT`):

```sh
deepl -sl IT -tl PT -f test.txt
```

#### Example 3

This will translate a Spanish (`ES`) text into Russian (`RU`) in _formal_ tone:

```sh
deepl -sl ES -tl RU --text "¿Cómo te llamas?" --formal
```

```plain
Как Вас зовут?
```

Note: _informal_ would be "_Как **тебя** зовут?_"

#### Example 4

This will translate a Japanese (`JP`) text into German (`DE`) in _informal_ tone:

```sh
deepl -sl JP -tl DE --text "お元気ですか？" --formal false
```

```plain
Wie geht es dir?
```

Note: _formal_ would be "_Wie geht es **Ihnen**?_"

### Node library

#### Example 1

This will translate a Chinese (`ZH`) text into Dutch (`NL`):

```js
import { translate } from 'deepl-translate'

translate('ZH', 'NL', '你好')
```

```log
'Hallo'
```

#### Example 2

This will translate a `danish` text into `german` in informal tone:

```js
import { translate } from 'deepl-translate'

translate('danish', 'german', 'Ring til mig!', undefined, undefined, false)
```

```log
'Ruf mich an!'
```
