#!/usr/bin/env node

import './fetch.js'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import {
  chunkByLength,
  getSharedCookies,
  translate,
  type SourceLanguage,
  type TargetLanguage,
  type TranslateOptions,
} from '@deeplx/core'
import { cjsRequire } from '@pkgr/core'
import { Option, program } from 'commander'

export interface DeepLXCliOptions {
  target: TargetLanguage
  source?: SourceLanguage
  text?: string[]
  file?: string[]
  dlSession?: string
  proxy?: string
  skipWarm?: boolean
  cookie?: string
  concurrency?: string
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

/** A chunk is one request; sending them one at a time is the safe default. */
function resolveConcurrency(value: string | undefined): number {
  const concurrency = value == null ? 1 : Number(value)
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be a positive integer')
  }
  return concurrency
}

/** Every value is one segment, in the order the options were given. */
async function resolveSegments(
  text: string[] | undefined,
  file: string[] | undefined,
): Promise<string[]> {
  // A blank text is a segment like any other — the client answers it with
  // itself, so blank lines keep their place in the output — while a blank file
  // path is not a file at all.
  const texts = text ?? []
  const files = (file ?? []).filter(value => value.trim() !== '')

  if (texts.length === 0 && files.length === 0) {
    throw new Error('One of `text` or `file` option must be specified')
  }

  if (texts.length > 0 && files.length > 0) {
    console.warn(
      'Both `text` and `file` options provided, `text` will take precedence',
    )
  }

  return texts.length > 0
    ? texts
    : Promise.all(files.map(value => fs.readFile(value, 'utf8')))
}

/** Explicit `--cookie` wins, then the cache, which also skips the warm-up. */
async function resolveCookies(
  cookie: string | undefined,
  dlSession: string | undefined,
): Promise<{ cookies?: string; skipWarm?: boolean }> {
  if (cookie) {
    return { cookies: cookie }
  }
  if (dlSession) {
    return {}
  }
  const cached = await loadCachedCookies()
  return cached ? { cookies: cached, skipWarm: true } : {}
}

/** One chunked request: the languages plus everything `translate` forwards. */
interface ChunkRequest extends TranslateOptions {
  concurrency: number
  target: TargetLanguage
  source?: SourceLanguage
}

/**
 * One request per chunk: the endpoint caps the *sum* of all text items, so the
 * segments are batched by total length, not by segment count. Chunks go out a
 * wave at a time, so `--concurrency` stays bounded and the results keep the
 * order of the segments they came from.
 */
async function translateChunks(
  chunks: readonly string[][],
  request: ChunkRequest,
): Promise<string[]> {
  const { concurrency, target, source, ...options } = request
  const translated: string[] = []
  for (let index = 0; index < chunks.length; index += concurrency) {
    const wave = chunks.slice(index, index + concurrency)
    const results = await Promise.all(
      wave.map(chunk => translate(chunk, target, source, options)),
    )
    translated.push(...results.flat())
  }
  return translated
}

/** Persist the shared cookies for the next invocation. */
async function saveCookies(dlSession: string | undefined): Promise<void> {
  if (dlSession) {
    return
  }
  const currentCookies = getSharedCookies()
  if (currentCookies) {
    await saveCookieCache(currentCookies)
  }
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
  .option(
    '--concurrency <count>',
    'How many chunks to send at once (default: 1; the endpoint rate-limits bursts)',
  )
  .action(async function () {
    const {
      source,
      target,
      text,
      file,
      dlSession,
      proxy,
      skipWarm,
      cookie,
      concurrency: concurrencyOption,
    } = this.opts<DeepLXCliOptions>()

    const concurrency = resolveConcurrency(concurrencyOption)
    const segments = await resolveSegments(text, file)
    const { cookies, skipWarm: cachedSkipWarm } = await resolveCookies(
      cookie,
      dlSession,
    )

    const translated = await translateChunks(chunkByLength(segments), {
      concurrency,
      target,
      source,
      dlSession,
      proxyUrl: proxy,
      skipWarm: cachedSkipWarm ?? skipWarm,
      cookies,
    })

    await saveCookies(dlSession)

    // One line per segment, in the order they were given.
    console.log(translated.join('\n'))
  })
  .parseAsync(process.argv)
  // eslint-disable-next-line unicorn-x/prefer-top-level-await
  .catch((err: unknown) => {
    process.exitCode = 1
    console.error(err)
  })
