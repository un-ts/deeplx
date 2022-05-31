/* eslint-disable @typescript-eslint/no-magic-numbers */

import { calculateValidTimestamp, generateId } from 'deeplx'

test('calculateValidTimestamp', () => {
  expect(calculateValidTimestamp(10, 0)).toBe(10)
  expect(calculateValidTimestamp(10, 1)).toBe(11)
  expect(calculateValidTimestamp(10, 2)).toBe(12)
  expect(calculateValidTimestamp(10, 3)).toBe(12)
  expect(calculateValidTimestamp(10, 4)).toBe(12)
  expect(calculateValidTimestamp(10, 5)).toBe(15)
  expect(calculateValidTimestamp(10, 6)).toBe(12)
})

test('generate_id', () => {
  expect(generateId()).toBeGreaterThan(1_000_000)
  expect(generateId()).toBeLessThan(100_000_000)
})
