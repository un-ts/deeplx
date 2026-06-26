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
import { Option, program } from 'commander'

export interface DeepLXCliOptions {
  target: TargetLanguage
  source?: SourceLanguage
  text?: string
  file?: string
  dlSession?: string
  proxy?: string
}

const { version, description } = cjsRequire<{
  version: string
  description: string
}>(fileURLToPath(new URL('../package.json', import.meta.url)))

program
  .name('deeplx')
  .version(version)
  .description(description)
  .option('-s, --source <text>', 'Source language of your text')
  .requiredOption('-t, --target <text>', 'Target language of your desired text')
  .option('--text <text>', 'Text to be translated')
  .option('-f, --file <path>', 'File to be translated')
  .addOption(
    new Option(
      '--dl-session <cookie>',
      'DeepL Pro session cookie (dl_session)',
    ).env('DL_SESSION'),
  )
  .option('--proxy <url>', 'Proxy URL for the request')
  .action(async function () {
    const { source, target, text, file, dlSession, proxy } =
      this.opts<DeepLXCliOptions>()

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
      {
        dlSession,
        proxyUrl: proxy,
      },
    )

    console.log(translated)
  })
  .parseAsync(process.argv)
  // eslint-disable-next-line unicorn-x/prefer-top-level-await
  .catch((err: unknown) => {
    process.exitCode = 1
    console.error(err)
  })
