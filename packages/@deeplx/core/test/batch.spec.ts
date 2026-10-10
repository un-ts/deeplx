import { beforeEach, expect, test, vi, type Mock } from 'vitest'
import { type xfetch } from 'x-fetch'

import {
  HTTP_STATUS_PAYLOAD_TOO_LARGE,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
  MAX_FREE_TEXT_LENGTH,
} from '@deeplx/core'

// Each test gets a fresh module instance so module-level state is isolated.
beforeEach(() => {
  vi.resetModules()
})

// The network call is the only thing replaced; the real `x-fetch` exports are
// kept so the error handling under test stays the production one.
async function setupXfetchMock(mock: Mock<typeof xfetch>) {
  const actual = await vi.importActual<typeof import('x-fetch')>('x-fetch')
  vi.doMock('x-fetch', () => ({ ...actual, xfetch: mock }))
  vi.doMock('node-fetch-native/proxy', () => ({ createProxy: () => ({}) }))
  return actual
}

function lastBody(mock: Mock<typeof xfetch>) {
  return mock.mock.lastCall?.[1]?.body as Record<string, unknown> | undefined
}

// The promise is expected to reject; returning the error lets the test assert
// its message and its `DeepLXTranslationErrorResult` cause.
async function rejectedError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(Error)
    return error as Error
  }
  throw new Error('expected the call to reject')
}

function causeOf(error: Error): unknown {
  return (error as { cause?: unknown }).cause
}

test('a string input keeps its one-element request and a string `data`', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    'Hallo',
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(lastBody(mockXfetch)).toMatchObject({ text: ['Hallo'] })
  expect(result).toMatchObject({
    code: 200,
    data: 'Hello',
    alternatives: [],
    sourceLang: 'DE',
    targetLang: 'EN',
    method: 'Free',
  })

  if ('data' in result) {
    // Compile-time: a string input resolves `data` to `string`, not `string[]`.
    const data: string = result.data
    expect(data).toBe('Hello')
  }
})

test('an empty string is answered with itself, without a request', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    '',
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(result).toMatchObject({ code: 200, data: '' })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('a string input over the limit keeps its existing 413 message', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const length = MAX_FREE_TEXT_LENGTH + 1
  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    'a'.repeat(length),
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(result).toMatchObject({
    code: HTTP_STATUS_PAYLOAD_TOO_LARGE,
    message: `text exceeds maximum length: ${length} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units)`,
  })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('an array of texts is a single request whose `text` is that array', async () => {
  const texts = ['Hallo', 'Welt', 'Danke']
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [
      { text: 'Hello', detected_source_language: 'DE' },
      { text: 'World', detected_source_language: 'DE' },
      { text: 'Thanks', detected_source_language: 'DE' },
    ],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    texts,
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(lastBody(mockXfetch)).toMatchObject({ text: texts })
  expect(result).toMatchObject({
    code: 200,
    data: ['Hello', 'World', 'Thanks'],
    alternatives: [],
    sourceLang: 'DE',
    targetLang: 'EN',
    method: 'Free',
  })

  if ('data' in result) {
    // Compile-time: an array input resolves `data` to `string[]`.
    const data: string[] = result.data
    expect(data).toStrictEqual(['Hello', 'World', 'Thanks'])
  }
})

test('a batch keeps one translation per input position, in request order', async () => {
  const texts = ['third', 'first', 'second']
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: '3rd' }, { text: '1st' }, { text: '2nd' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    undefined,
    'EN',
    texts,
    undefined,
    undefined,
    undefined,
    true,
  )

  // The request order is the input order, and the response order is untouched:
  // nothing is sorted or matched by content.
  expect(lastBody(mockXfetch)).toMatchObject({ text: texts })
  expect(result).toMatchObject({ data: ['3rd', '1st', '2nd'] })
})

test('a batch response with fewer translations than texts is rejected', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'eins' }, { text: 'zwei' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const error = await rejectedError(
    translateByDeepLX(
      'DE',
      'EN',
      ['eins', 'zwei', 'drei'],
      undefined,
      undefined,
      undefined,
      true,
    ),
  )

  const message = 'translation count mismatch: expected 3 translations, got 2'
  expect(error.message).toBe(message)
  expect(causeOf(error)).toEqual({
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    message,
  })
})

test('a batch response with more translations than texts is rejected', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'eins' }, { text: 'zwei' }, { text: 'drei' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const error = await rejectedError(
    translateByDeepLX(
      'DE',
      'EN',
      ['eins', 'zwei'],
      undefined,
      undefined,
      undefined,
      true,
    ),
  )

  const message = 'translation count mismatch: expected 2 translations, got 3'
  expect(error.message).toBe(message)
  expect(causeOf(error)).toEqual({
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    message,
  })
})

test('an empty batch is answered with an empty list', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    [],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(result).toMatchObject({ code: 200, data: [] })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('a batch that keeps a segment untranslated fails the whole call', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello' }, { text: '' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  await expect(
    translateByDeepLX(
      'DE',
      'EN',
      ['Hallo', 'Welt'],
      undefined,
      undefined,
      undefined,
      true,
    ),
  ).resolves.toMatchObject({
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    message: 'Translation failed',
  })
})

test('a transport failure on a batch is still a result, not a throw', async () => {
  const mockXfetch = vi
    .fn<typeof xfetch>()
    .mockRejectedValue(new Error('network down'))
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  await expect(
    translateByDeepLX(
      'DE',
      'EN',
      ['Hallo', 'Welt'],
      undefined,
      undefined,
      undefined,
      true,
    ),
  ).resolves.toMatchObject({
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    message: 'Error: network down',
  })
})

test('a batch is rejected locally over the anonymous total-length limit', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  // The endpoint caps the *sum* of all items: 1500 + 1 characters in two texts.
  const half = MAX_FREE_TEXT_LENGTH / 2
  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    ['a'.repeat(half), 'b'.repeat(half + 1)],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(result).toMatchObject({
    code: HTTP_STATUS_PAYLOAD_TOO_LARGE,
    message: `texts exceed maximum total length: ${MAX_FREE_TEXT_LENGTH + 1} characters across 2 texts (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units per request)`,
  })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('a batch at exactly the anonymous total-length limit is sent', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'eins' }, { text: 'zwei' }],
  })
  await setupXfetchMock(mockXfetch)

  const half = MAX_FREE_TEXT_LENGTH / 2
  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    ['a'.repeat(half), 'b'.repeat(half)],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(result).toMatchObject({ code: 200 })
})

test('the language maps still apply to a batch request', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [
      { text: 'hello', detected_source_language: 'zh' },
      { text: 'good morning', detected_source_language: 'zh' },
    ],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'zh-hant',
    'dutch',
    ['你好', '早上好'],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(lastBody(mockXfetch)).toMatchObject({
    text: ['你好', '早上好'],
    source_lang: 'zh',
    target_lang: 'nl',
  })
  expect(result).toMatchObject({
    data: ['hello', 'good morning'],
    sourceLang: 'ZH',
    targetLang: 'dutch',
  })
})

test('the language maps still apply to a string request', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'hello', detected_source_language: 'zh' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'ZH-HANS',
    'EN',
    '你好',
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(lastBody(mockXfetch)).toMatchObject({
    text: ['你好'],
    source_lang: 'zh',
    target_lang: 'en-US',
  })
  expect(result).toMatchObject({ data: 'hello', sourceLang: 'ZH' })
})

test('the translate helper returns a string for a string input', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translate } = await import('@deeplx/core')
  const result = await translate('Hallo', 'EN', 'DE', { skipWarm: true })

  // Compile-time: a string input resolves to `string`, not `string[]`.
  const data: string = result
  expect(data).toBe('Hello')
})

test('the translate helper returns one string per text for an array input', async () => {
  const texts = ['eins', 'zwei']
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'one' }, { text: 'two' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translate } = await import('@deeplx/core')
  const result = await translate(texts, 'EN', 'DE', { skipWarm: true })

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(lastBody(mockXfetch)).toMatchObject({ text: texts })
  // Compile-time: an array input resolves to `string[]`.
  const data: string[] = result
  expect(data).toStrictEqual(['one', 'two'])
})

test('the translate helper throws a returned error result', async () => {
  const mockXfetch = vi
    .fn<typeof xfetch>()
    .mockRejectedValue(new Error('network down'))
  await setupXfetchMock(mockXfetch)

  const { translate } = await import('@deeplx/core')
  await expect(
    translate('Hallo', 'EN', 'DE', { skipWarm: true }),
  ).rejects.toThrow('Error: network down')
})

test('the translate helper propagates a batch alignment failure', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'one' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translate } = await import('@deeplx/core')
  await expect(
    translate(['eins', 'zwei'], 'EN', 'DE', { skipWarm: true }),
  ).rejects.toThrow(
    'translation count mismatch: expected 2 translations, got 1',
  )
})

test('a blank segment is answered locally with its own text', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'one' }, { text: 'three' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    ['eins', '', '   ', 'drei'],
    undefined,
    undefined,
    undefined,
    true,
  )

  // The blank segments are not sent, but they keep their positions: the empty
  // one stays empty and the whitespace one keeps its own text (which is what
  // the endpoint returns for whitespace anyway).
  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(lastBody(mockXfetch)).toMatchObject({ text: ['eins', 'drei'] })
  expect(result).toMatchObject({
    code: 200,
    data: ['one', '', '   ', 'three'],
  })
})

test('empty segments at either end keep their positions', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'one' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    ['', 'eins', ''],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(lastBody(mockXfetch)).toMatchObject({ text: ['eins'] })
  expect(result).toMatchObject({ code: 200, data: ['', 'one', ''] })
})

test('a batch whose segments are all blank is answered with them', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const texts = ['', '   ', '\t\n']
  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    texts,
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(result).toMatchObject({ code: 200, data: texts })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('the total-length limit counts UTF-16 code units, as the endpoint does', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  // `MAX_FREE_TEXT_LENGTH / 2` emoji are exactly the limit in UTF-16 units, so
  // one more emoji is two units over while a code-point count would still fit.
  const result = await translateByDeepLX(
    'DE',
    'EN',
    ['😀'.repeat(MAX_FREE_TEXT_LENGTH / 2), '😀'],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(result).toMatchObject({
    code: HTTP_STATUS_PAYLOAD_TOO_LARGE,
    message: `texts exceed maximum total length: ${MAX_FREE_TEXT_LENGTH + 2} characters across 2 texts (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units per request)`,
  })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('a batch at the limit in UTF-16 code units is still sent', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'x' }],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  // MAX_FREE_TEXT_LENGTH / 2 emoji are exactly MAX_FREE_TEXT_LENGTH UTF-16
  // units, although they are only half as many code points.
  const result = await translateByDeepLX(
    'DE',
    'EN',
    ['😀'.repeat(MAX_FREE_TEXT_LENGTH / 2)],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(result).toMatchObject({ code: 200 })
})

test('a batch response with no translations throws the alignment error', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const error = await rejectedError(
    translateByDeepLX(
      'DE',
      'EN',
      ['eins', 'zwei'],
      undefined,
      undefined,
      undefined,
      true,
    ),
  )

  const message = 'translation count mismatch: expected 2 translations, got 0'
  expect(error.message).toBe(message)
  expect(causeOf(error)).toEqual({
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    message,
  })
})

test('a string response with no translations still resolves to the 503 result', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [],
  })
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  await expect(
    translateByDeepLX(
      'DE',
      'EN',
      'Hallo',
      undefined,
      undefined,
      undefined,
      true,
    ),
  ).resolves.toMatchObject({
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    message: 'Translation failed',
  })
})

test('a whitespace-only string is answered locally', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    '   ',
    undefined,
    undefined,
    undefined,
    true,
  )

  // Whitespace carries nothing, so it is answered with itself rather than being
  // sent for the endpoint to echo.
  expect(result).toMatchObject({ code: 200, data: '   ' })
  expect(mockXfetch).not.toHaveBeenCalled()
})

test('an unsupported language is still rejected for a blank request', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    // @ts-expect-error -- only supported languages are accepted by the types
    'klingon',
    ['', '   '],
    undefined,
    undefined,
    undefined,
    true,
  )

  expect(mockXfetch).not.toHaveBeenCalled()
  expect(result).toMatchObject({
    code: 400,
    message: 'unsupported target_lang "klingon"',
  })
})

test('the translate helper answers a blank text with itself', async () => {
  const mockXfetch = vi.fn<typeof xfetch>()
  await setupXfetchMock(mockXfetch)

  const { translate } = await import('@deeplx/core')
  await expect(translate('', 'EN', 'DE', { skipWarm: true })).resolves.toBe('')
  await expect(
    translate(['', '   '], 'EN', 'DE', { skipWarm: true }),
  ).resolves.toStrictEqual(['', '   '])
  expect(mockXfetch).not.toHaveBeenCalled()
})
