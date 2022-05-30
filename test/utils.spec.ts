import { expect, test } from 'vitest'

import { abbreviateLanguage } from 'deepl-translate'

test('abbreviateLanguage', () => {
  expect(abbreviateLanguage('RuSsIaN')).toBe('RU')
  expect(abbreviateLanguage('ru')).toBe('RU')
  expect(abbreviateLanguage('japanese')).toBe('JA')
  expect(abbreviateLanguage('ZH')).toBe('ZH')
  expect(abbreviateLanguage('wambo')).toBeUndefined()
})
