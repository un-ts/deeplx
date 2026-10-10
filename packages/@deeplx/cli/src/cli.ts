#!/usr/bin/env node

import './fetch.js'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import {
  getSharedCookies,
  translateByDeepLX,
  type SourceLanguage,
  type TargetLanguage,
} from '@deeplx/core'
import { cjsRequire } from '@pkgr/core'
import { Option, program } from 'commander'

import { chunkByLength } from './chunk.ts'

export interface DeepLXCliOptions {
  target: TargetLanguage
  source?: SourceLanguage
  text?: string[]
  file?: string[]
  dlSession?: string
  proxy?: string
  skipWarm?: boolean
  cookie?: string
}

const COOKIE_CACHE_FILE = path.join(os.homedir(), '.deeplx_cookies')
const COOKIE_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CookieCache {
  cookies: string
  timestamp: number
}

async function loadCachedCookies(): Promise<string | null> {
  try {
    const raw = await fs.readFile(COOKIE_CACHE_FILE, 'utf8')
    const cache = JSON.parse(raw) as CookieCache
    if (
      cache.cookies &&
      typeof cache.timestamp === 'number' &&
      Date.now() - cache.timestamp < COOKIE_CACHE_TTL_MS
    ) {
      return cache.cookies
    }
  } catch {
    // cache missing or invalid
  }
  return null
}

async function saveCookieCache(cookies: string): Promise<void> {
  try {
    const cache: CookieCache = { cookies, timestamp: Date.now() }
    await fs.writeFile(COOKIE_CACHE_FILE, JSON.stringify(cache), {
      encoding: 'utf8',
      mode: 0o600,
    })
  } catch {
    // ignore cache write errors
  }
}

/** Collect the values of a repeatable option, in the order they were given. */
function collect(value: string, previous: string[] | undefined): string[] {
  return previous ? [...previous, value] : [value]
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
  .option(
    '--text <text>',
    'Text to be translated, repeatable: every value is a segment of one batch',
    collect,
  )
  .option(
    '-f, --file <path>',
    'File to be translated, repeatable: every file is a segment of one batch',
    collect,
  )
  .addOption(
    new Option(
      '--dl-session <cookie>',
      'DeepL Pro session cookie (dl_session)',
    ).env('DL_SESSION'),
  )
  .option('--proxy <url>', 'Proxy URL for the request')
  .option('--skip-warm', 'Skip the warmup cookie fetch')
  .option('--cookie <value>', 'Provide cookies directly (skips warmup fetch)')
  .action(async function () {
    const { source, target, text, file, dlSession, proxy, skipWarm, cookie } =
      this.opts<DeepLXCliOptions>()

    // A blank value means "not given", as it did for the single-value options.
    const texts = (text ?? []).filter(value => value.trim() !== '')
    const files = (file ?? []).filter(value => value.trim() !== '')
    const isTextNil = texts.length === 0
    const isFileNil = files.length === 0

    if (isTextNil && isFileNil) {
      throw new Error('One of `text` or `file` option must be specified')
    }

    if (!isTextNil && !isFileNil) {
      console.warn(
        'Both `text` and `file` options provided, `text` will take precedence',
      )
    }

    // Every value is one segment, and the output follows this order.
    const segments = isTextNil
      ? await Promise.all(files.map(value => fs.readFile(value, 'utf8')))
      : texts

    // Resolve cookies to use: explicit --cookie flag > cache > warmup
    let resolvedCookies: string | undefined
    let resolvedSkipWarm = skipWarm

    if (cookie) {
      resolvedCookies = cookie
    } else if (!dlSession) {
      const cached = await loadCachedCookies()
      if (cached) {
        // Use cached cookies and skip the network warmup since we already have them
        resolvedCookies = cached
        resolvedSkipWarm = true
      }
    }

    // One request per chunk: the endpoint caps the *sum* of all text items, so
    // the segments are batched by total length, not by segment count.
    const translated: string[] = []
    for (const chunk of chunkByLength(segments)) {
      const result = await translateByDeepLX(
        source,
        target,
        chunk,
        proxy,
        dlSession,
        undefined,
        resolvedSkipWarm,
        resolvedCookies,
      )
      if ('message' in result) {
        throw new Error(result.message, { cause: result })
      }
      translated.push(...result.data)
    }

    // Persist cookies for future invocations
    if (!dlSession) {
      const currentCookies = getSharedCookies()
      if (currentCookies) {
        await saveCookieCache(currentCookies)
      }
    }

    // One line per segment, in the order they were given.
    console.log(translated.join('\n'))
  })
  .parseAsync(process.argv)
  // eslint-disable-next-line unicorn-x/prefer-top-level-await
  .catch((err: unknown) => {
    process.exitCode = 1
    console.error(err)
  })
