#!/usr/bin/env node

import './fetch.js'

import fs from 'node:fs/promises'
import { URL } from 'node:url'

import { cjsRequire } from '@pkgr/core'
import { program } from 'commander'

import { translate } from './api.js'
import type { SourceLanguage, TargetLanguage } from './constants.js'

const { version, description } = cjsRequire<{
  version: string
  description: string
}>(new URL('../package.json', import.meta.url).pathname)

void program
  .version(version)
  .description(description)
  .option('-sl, --source-language <text>', 'Source language of your text')
  .option(
    '-tl, --target-language <text>',
    'Target language of your desired text',
  )
  .option('-t, --text <text>', 'Text to be translated')
  .option('-f, --file <path>', 'File to be translated')
  .action(async function () {
    const { sourceLanguage, targetLanguage, text, file } = this.opts<{
      targetLanguage: TargetLanguage
      sourceLanguage?: SourceLanguage
      text?: string
      file?: string
    }>()

    if (text == null && file == null) {
      throw new Error('One of `text` or `file` option must be specificated')
    }

    const translated = await translate(
      text == null ? await fs.readFile(file!, 'utf8') : text,
      targetLanguage,
      sourceLanguage,
    )

    console.log(translated)
  })
  .parseAsync(process.argv)
