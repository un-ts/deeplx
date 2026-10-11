import { expect, test } from 'vitest'

import { chunkByLength, MAX_FREE_TEXT_LENGTH } from '@deeplx/core'

test('keeps a single segment in a single chunk', () => {
  expect(chunkByLength(['Hallo'])).toStrictEqual([['Hallo']])
})

test('packs by total length up to the limit, preserving order', () => {
  const half = Math.floor(MAX_FREE_TEXT_LENGTH / 2)
  const texts = ['a'.repeat(half), 'b'.repeat(half), 'c']

  // The first two fill the limit exactly; the third starts a new chunk.
  expect(chunkByLength(texts)).toStrictEqual([[texts[0], texts[1]], [texts[2]]])
})

test('counts UTF-16 code units, which is the unit the endpoint charges', () => {
  const emoji = '😀😀'

  // 4 UTF-16 units per segment with a limit of 4: the second starts a new chunk,
  // even though a code-point count (2 each) would have kept them together.
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  expect(chunkByLength([emoji, emoji], 4)).toStrictEqual([[emoji], [emoji]])
})

test('never splits a segment, and keeps an oversized one alone', () => {
  const oversized = 'a'.repeat(MAX_FREE_TEXT_LENGTH + 1)

  expect(chunkByLength(['short', oversized, 'short'])).toStrictEqual([
    ['short'],
    [oversized],
    ['short'],
  ])
})

test('returns no chunks for no segments', () => {
  expect(chunkByLength([])).toStrictEqual([])
})
