#!/usr/bin/env node

import './fetch.js'

import fs from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import {
  translate,
  type SourceLanguage,
  type TargetLanguage,
} from '@deeplx/core'
import { cjsRequire } from '@pkgr/core'
import { program } from 'commander'

export interface DeepLXCliOptions {
  target: TargetLanguage
  source?: SourceLanguage
  text?: string
  file?: string
  formal?: boolean
}

const { version, description } = cjsRequire<{
  version: string
  description: string
}>(fileURLToPath(new URL('../package.json', import.meta.url)))

const FALSY_VALUES = new Set(['0', 'false', 'n', 'no', 'off'])

program
  .name('deeplx')
  .version(version)
  .description(description)
  .option('-s, --source <text>', 'Source language of your text')
  .requiredOption('-t, --target <text>', 'Target language of your desired text')
  .option('--text <text>', 'Text to be translated')
  .option('-f, --file <path>', 'File to be translated')
  .option(
    '--formal [boolean]',
    'Whether to use formal (true) or informal (false) tone in translation. Default `undefined` respects source text tone.',
    (formal?: string) => (formal == null ? formal : !FALSY_VALUES.has(formal)),
  )
  .option('--no-formal')
  .action(async function () {
    const { source, target, text, file, formal } = this.opts<DeepLXCliOptions>()

    const isTextNil = text == null || text.trim() === ''
    const isFileNil = file == null || file.trim() === ''

    if (isTextNil && isFileNil) {
      throw new Error('One of `text` or `file` option must be specified')
    }

    if (!isTextNil && !isFileNil) {
      console.warn(
        'Both `text` and `file` options provided, `text` will take precedence',
      )
    }

    const translated = await translate(
      isTextNil ? await fs.readFile(file!, 'utf8') : text,
      target,
      source,
      formal,
    )

    console.log(translated)
  })
  .parseAsync(process.argv)
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((err: unknown) => {
    process.exitCode = 1
    console.error(err)
  })
