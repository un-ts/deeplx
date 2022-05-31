import { abbreviateLanguage } from 'deeplx'

test('abbreviateLanguage', () => {
  expect(abbreviateLanguage('RuSsIaN')).toBe('RU')
  expect(abbreviateLanguage('ru')).toBe('RU')
  expect(abbreviateLanguage('japanese')).toBe('JA')
  expect(abbreviateLanguage('ZH')).toBe('ZH')
  expect(abbreviateLanguage('wambo')).toBeUndefined()
})
