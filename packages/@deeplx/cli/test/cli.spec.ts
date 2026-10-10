import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  MAX_FREE_TEXT_LENGTH,
  type SourceLanguage,
  type TargetLanguage,
  type TranslateOptions,
} from '@deeplx/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

type Translate = (
  text: readonly string[],
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  options?: TranslateOptions,
) => Promise<string[]>

const ORIGINAL_ARGV = process.argv
const ORIGINAL_EXIT_CODE = process.exitCode
const WAIT = { timeout: 5000 }
/** Makes the first chunk of a wave finish after the chunk beside it. */
const SLOW_CHUNK_MS = 40
const tempDirs: string[] = []

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

afterEach(async () => {
  vi.restoreAllMocks()
  process.argv = ORIGINAL_ARGV
  process.exitCode = ORIGINAL_EXIT_CODE
  await Promise.all(
    tempDirs
      .splice(0)
      .map(async dir => fs.rm(dir, { recursive: true, force: true })),
  )
})

async function tempFile(name: string, content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'deeplx-cli-'))
  tempDirs.push(dir)
  const file = path.join(dir, name)
  await fs.writeFile(file, content)
  return file
}

// The bin parses `process.argv` when it is evaluated. `commander` exports a
// shared `program` singleton, so every run gets a fresh command, and the core
// client is replaced by the given mock.
async function runCli(args: string[], translate: Translate) {
  process.argv = ['node', 'deeplx', ...args]
  const [core, commander] = await Promise.all([
    vi.importActual<typeof import('@deeplx/core')>('@deeplx/core'),
    vi.importActual<typeof import('commander')>('commander'),
  ])
  vi.doMock('@deeplx/core', () => ({
    ...core,
    getSharedCookies: () => '',
    translate,
  }))
  vi.doMock('commander', () => ({
    ...commander,
    program: new commander.Command(),
  }))
  // Capture the CLI output instead of printing it.
  const log = vi.spyOn(console, 'log').mockImplementation(vi.fn())
  const warn = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
  const error = vi.spyOn(console, 'error').mockImplementation(vi.fn())
  await import('../src/cli.ts')
  return { error, log, warn }
}

test('a single --text is one one-segment batch, printed once', async () => {
  const translate = vi.fn<Translate>().mockResolvedValue(['Hallo'])
  const { log } = await runCli(['-t', 'ZH', '--text', 'Hallo'], translate)

  await vi.waitFor(() => expect(translate).toHaveBeenCalledOnce(), WAIT)
  expect(translate.mock.calls[0][0]).toStrictEqual(['Hallo'])
  await vi.waitFor(() => expect(log).toHaveBeenCalledWith('Hallo'), WAIT)
})

test('repeated --text values are one batch, one output line per segment', async () => {
  const translate = vi
    .fn<Translate>()
    .mockResolvedValue(['eins', 'zwei', 'drei'])
  const { log } = await runCli(
    ['-t', 'ZH', '--text', 'eins', '--text', 'zwei', '--text', 'drei'],
    translate,
  )

  await vi.waitFor(() => expect(translate).toHaveBeenCalledOnce(), WAIT)
  expect(translate.mock.calls[0][0]).toStrictEqual(['eins', 'zwei', 'drei'])
  await vi.waitFor(
    () => expect(log).toHaveBeenCalledWith('eins\nzwei\ndrei'),
    WAIT,
  )
})

test('a batch at exactly the anonymous limit stays one request', async () => {
  const half = MAX_FREE_TEXT_LENGTH / 2
  const first = 'a'.repeat(half)
  const second = 'b'.repeat(half)
  const translate = vi.fn<Translate>().mockResolvedValue(['first', 'second'])
  const { log } = await runCli(
    ['-t', 'ZH', '--text', first, '--text', second],
    translate,
  )

  await vi.waitFor(() => expect(translate).toHaveBeenCalledOnce(), WAIT)
  expect(translate.mock.calls[0][0]).toStrictEqual([first, second])
  await vi.waitFor(
    () => expect(log).toHaveBeenCalledWith('first\nsecond'),
    WAIT,
  )
})

test('segments over the limit are chunked by total length, in order', async () => {
  const half = MAX_FREE_TEXT_LENGTH / 2
  const first = 'a'.repeat(half)
  const second = 'b'.repeat(half + 1)
  const translate = vi
    .fn<Translate>()
    .mockResolvedValueOnce(['first'])
    .mockResolvedValueOnce(['second'])
  const { log } = await runCli(
    ['-t', 'ZH', '--text', first, '--text', second],
    translate,
  )

  await vi.waitFor(() => expect(translate).toHaveBeenCalledTimes(2), WAIT)
  expect(translate.mock.calls[0][0]).toStrictEqual([first])
  expect(translate.mock.calls[1][0]).toStrictEqual([second])
  await vi.waitFor(
    () => expect(log).toHaveBeenCalledWith('first\nsecond'),
    WAIT,
  )
})

test('repeated --file values are read in order as one batch', async () => {
  const first = await tempFile('first.txt', 'eins')
  const second = await tempFile('second.txt', 'zwei')
  const translate = vi.fn<Translate>().mockResolvedValue(['one', 'two'])
  const { log } = await runCli(
    ['-t', 'ZH', '-f', first, '-f', second],
    translate,
  )

  await vi.waitFor(() => expect(translate).toHaveBeenCalledOnce(), WAIT)
  expect(translate.mock.calls[0][0]).toStrictEqual(['eins', 'zwei'])
  await vi.waitFor(() => expect(log).toHaveBeenCalledWith('one\ntwo'), WAIT)
})

test('--text takes precedence over --file with a warning', async () => {
  const file = await tempFile('file.txt', 'zwei')
  const translate = vi.fn<Translate>().mockResolvedValue(['one'])
  const { warn } = await runCli(
    ['-t', 'ZH', '--text', 'eins', '-f', file],
    translate,
  )

  await vi.waitFor(() => expect(translate).toHaveBeenCalledOnce(), WAIT)
  expect(translate.mock.calls[0][0]).toStrictEqual(['eins'])
  expect(warn).toHaveBeenCalledOnce()
})

test('neither --text nor --file fails the command', async () => {
  const translate = vi.fn<Translate>()
  const { error } = await runCli(['-t', 'ZH'], translate)

  await vi.waitFor(() => expect(error).toHaveBeenCalled(), WAIT)
  expect(translate).not.toHaveBeenCalled()
  expect(process.exitCode).toBe(1)
  expect(String(error.mock.calls[0][0])).toContain(
    'One of `text` or `file` option must be specified',
  )
})

test('a rejected translation fails the command with its message', async () => {
  const translate = vi
    .fn<Translate>()
    .mockRejectedValue(new Error('texts exceed maximum total length'))
  const { error } = await runCli(['-t', 'ZH', '--text', 'Hallo'], translate)

  await vi.waitFor(() => expect(error).toHaveBeenCalled(), WAIT)
  expect(process.exitCode).toBe(1)
  expect(String(error.mock.calls[0][0])).toContain(
    'texts exceed maximum total length',
  )
})

test('without --concurrency the chunks go out one at a time', async () => {
  // Just over half the limit, so every segment is a chunk of its own.
  const segmentSize = MAX_FREE_TEXT_LENGTH / 2 + 1
  const segments = ['a'.repeat(segmentSize), 'b'.repeat(segmentSize)]
  let inFlight = 0
  let peak = 0
  const translate = vi.fn<Translate>().mockImplementation(async text => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise(resolve => setTimeout(resolve, 5))
    inFlight -= 1
    return text.map(value => value[0])
  })

  const { log } = await runCli(
    [
      '-t',
      'ZH',
      ...segments.flatMap(segment => ['--text', segment]),
      '--concurrency',
      '1',
    ],
    translate,
  )

  await vi.waitFor(() => expect(log).toHaveBeenCalledOnce(), WAIT)
  expect(translate).toHaveBeenCalledTimes(2)
  expect(peak).toBe(1)
  expect(log).toHaveBeenCalledWith('a\nb')
})

test('--concurrency bounds the requests in flight and keeps the order', async () => {
  // Just over half the limit, so every segment is a chunk of its own.
  const segmentSize = MAX_FREE_TEXT_LENGTH / 2 + 1
  const segments = [
    'a'.repeat(segmentSize),
    'b'.repeat(segmentSize),
    'c'.repeat(segmentSize),
  ]
  let inFlight = 0
  let peak = 0
  const translate = vi.fn<Translate>().mockImplementation(async text => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    // The first chunk finishes last, so printing in completion order would
    // reorder the segments.
    await new Promise(resolve =>
      setTimeout(resolve, text[0].startsWith('a') ? SLOW_CHUNK_MS : 5),
    )
    inFlight -= 1
    return text.map(value => value[0])
  })

  const { log } = await runCli(
    [
      '-t',
      'ZH',
      ...segments.flatMap(segment => ['--text', segment]),
      '--concurrency',
      '2',
    ],
    translate,
  )

  await vi.waitFor(() => expect(log).toHaveBeenCalledOnce(), WAIT)
  expect(translate).toHaveBeenCalledTimes(3)
  expect(peak).toBe(2)
  expect(log).toHaveBeenCalledWith('a\nb\nc')
})

test('a non-positive --concurrency fails the command', async () => {
  const translate = vi.fn<Translate>()
  const { error } = await runCli(
    ['-t', 'ZH', '--text', 'Hallo', '--concurrency', '0'],
    translate,
  )

  await vi.waitFor(() => expect(error).toHaveBeenCalled(), WAIT)
  expect(process.exitCode).toBe(1)
  expect(String(error.mock.calls[0][0])).toContain(
    '--concurrency must be a positive integer',
  )
  expect(translate).not.toHaveBeenCalled()
})
