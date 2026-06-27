import { beforeEach, expect, test, vi } from 'vitest'
import { type xfetch } from 'x-fetch'
// Each test gets a fresh module instance so module-level state is isolated.
beforeEach(() => {
  vi.resetModules()
})

test('getSharedCookies returns empty string initially', async () => {
  const { getSharedCookies } = await import('@deeplx/core')
  expect(getSharedCookies()).toBe('')
})

test('translateByDeepLX with cookies option uses local cookies and skips warmup fetch', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { translateByDeepLX } = await import('@deeplx/core')
  const result = await translateByDeepLX(
    'DE',
    'EN',
    'Hallo',
    undefined,
    undefined,
    undefined,
    false,
    'injected=cookie',
  )

  // Only the translation endpoint should be called – not the warmup endpoint
  expect(mockXfetch).toHaveBeenCalledOnce()
  const lastCall = mockXfetch.mock.lastCall
  expect(lastCall![0]).toBe('https://oneshot-free.www.deepl.com/v1/translate')
  expect(lastCall![1]?.method).toBe('POST')
  expect(lastCall![1]?.headers).toMatchObject({
    Cookie: 'injected=cookie',
  })

  expect(result).toMatchObject({
    code: 200,
    data: 'Hello',
    sourceLang: 'DE',
    targetLang: 'EN',
  })
})

test('translateByDeepLX with skipWarm option skips warmup fetch', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { translateByDeepLX } = await import('@deeplx/core')
  await translateByDeepLX(
    'DE',
    'EN',
    'Hallo',
    undefined,
    undefined,
    undefined,
    true,
  )

  // Only the translation endpoint should be called – not the warmup endpoint
  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(mockXfetch).toHaveBeenCalledWith(
    'https://oneshot-free.www.deepl.com/v1/translate',
    expect.anything(),
  )
})

test('translate helper passes cookies option through to translateByDeepLX as local override', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { translate } = await import('@deeplx/core')
  const result = await translate('Hallo', 'EN', 'DE', {
    cookies: 'via=translate',
  })

  expect(result).toBe('Hello')
  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(mockXfetch.mock.lastCall![1]?.headers).toMatchObject({
    Cookie: 'via=translate',
  })
})

test('translate helper passes skipWarm option through to translateByDeepLX', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { translate } = await import('@deeplx/core')
  const result = await translate('Hallo', 'EN', 'DE', { skipWarm: true })

  expect(result).toBe('Hello')
  expect(mockXfetch).toHaveBeenCalledOnce()
})
