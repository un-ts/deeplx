#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { URL } from 'node:url'

import { program } from 'commander'

import { translate } from './api.js'
import { type SourceLanguage, type TargetLanguage } from './settings.js'

const __dirname = new URL('.', import.meta.url).pathname

const main = async () => {
  const pkg = JSON.parse(
    await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'),
  ) as {
    version: string
    description: string
  }
  const { sourceLanguage, targetLanguage, text, file, formal } = program
    .version(pkg.version)
    .description(pkg.description)
    .option('-sl, --source-language <text>', 'Source language of your text')
    .option(
      '-tl, --target-language <text>',
      'Target language of your desired text',
    )
    .option('--formal [boolean]', 'Use formal or informal tone in translation')
    .option('-t, --text <text>', 'Text to be translated')
    .option('-f, --file <path>', 'File to be translated')
    .parse(process.argv)
    .opts<{
      targetLanguage: TargetLanguage
      sourceLanguage?: SourceLanguage
      text?: string
      file?: string
      formal?: boolean
    }>()

  if (text == null && file == null) {
    throw new Error('One of `text` or `file` option must be specificated')
  }

  const translated = await translate(
    text == null ? await fs.readFile(file!, 'utf8') : text,
    targetLanguage,
    sourceLanguage,
    undefined,
    undefined,
    formal == null ? formal : formal ? 'formal' : 'informal',
  )

  console.log(translated)
}

main().catch((err: unknown) => {
  process.exitCode = 1
  console.error(err)
})
