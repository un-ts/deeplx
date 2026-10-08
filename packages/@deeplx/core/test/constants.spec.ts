import { SOURCE_LANG_MAP, TARGET_LANG_MAP } from '@deeplx/core'

test('Chinese source codes resolve to the generic "zh"', () => {
  // DeepL does not accept the target-only script forms (zh-Hans / zh-Hant) as a
  // source hint: it behaves as if source_lang were omitted, so ambiguous
  // mixed-script Chinese is auto-detected as English and comes back unchanged.
  expect(SOURCE_LANG_MAP.ZH).toBe('zh')
  expect(SOURCE_LANG_MAP['ZH-HANS']).toBe('zh')
  expect(SOURCE_LANG_MAP['ZH-HANT']).toBe('zh')
})

test('other source codes keep their generic forms', () => {
  expect(SOURCE_LANG_MAP.EN).toBe('en')
  expect(SOURCE_LANG_MAP.PT).toBe('pt')
  expect(SOURCE_LANG_MAP.DE).toBe('de')
})

test('Chinese target codes keep their script variants', () => {
  // The target side must stay untouched: those forms are correct targets.
  expect(TARGET_LANG_MAP.ZH).toBe('zh-Hans')
  expect(TARGET_LANG_MAP['ZH-HANS']).toBe('zh-Hans')
  expect(TARGET_LANG_MAP['ZH-HANT']).toBe('zh-Hant')
})
