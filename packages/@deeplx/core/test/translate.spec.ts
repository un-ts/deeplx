import { beforeEach, expect, test, vi } from 'vitest'

// Each test gets a fresh module instance so module-level state is isolated.
beforeEach(() => {
  vi.resetModules()
})

test('getSharedCookies returns empty string initially', async () => {
  const { getSharedCookies } = await import('@deeplx/core')
  expect(getSharedCookies()).toBe('')
})

test('setSharedCookies persists cookies retrievable via getSharedCookies', async () => {
  const { getSharedCookies, setSharedCookies } = await import('@deeplx/core')
  setSharedCookies('userCountry=US; verifiedBot=false')
  expect(getSharedCookies()).toBe('userCountry=US; verifiedBot=false')
})

test('setSharedCookies overrides previous value', async () => {
  const { getSharedCookies, setSharedCookies } = await import('@deeplx/core')
  setSharedCookies('first=value')
  setSharedCookies('second=value')
  expect(getSharedCookies()).toBe('second=value')
})

test('translateByDeepLX with cookies option pins cookies and skips warmup fetch', async () => {
  const mockXfetch = vi.fn().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { getSharedCookies, translateByDeepLX } = await import('@deeplx/core')
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
  expect(mockXfetch).toHaveBeenCalledWith(
    'https://oneshot-free.www.deepl.com/v1/translate',
    expect.objectContaining({ method: 'POST' }),
  )
  // Cookies must be pinned
  expect(getSharedCookies()).toBe('injected=cookie')
  expect(result).toMatchObject({
    code: 200,
    data: 'Hello',
    sourceLang: 'DE',
    targetLang: 'EN',
  })
})

test('translateByDeepLX with skipWarm option skips warmup fetch', async () => {
  const mockXfetch = vi.fn().mockResolvedValue({
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

test('setSharedCookies resolves warmupPromise so subsequent calls skip warmup', async () => {
  const mockXfetch = vi.fn().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { setSharedCookies, translateByDeepLX } = await import('@deeplx/core')

  // Inject cookies externally (no warmup)
  setSharedCookies('userCountry=US; verifiedBot=false')

  // Calling without skipWarm or cookies should still skip the warmup because
  // setSharedCookies already resolved warmupPromise
  await translateByDeepLX('DE', 'EN', 'Hallo')

  expect(mockXfetch).toHaveBeenCalledOnce()
  expect(mockXfetch).not.toHaveBeenCalledWith(
    'https://www.deepl.com/translator',
    expect.anything(),
  )
})

test('translate helper passes cookies option through to translateByDeepLX', async () => {
  const mockXfetch = vi.fn().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  vi.doMock('x-fetch', () => ({
    xfetch: mockXfetch,
    ResponseError: class ResponseError extends Error {},
  }))
  vi.doMock('node-fetch-native/proxy', () => ({
    createProxy: () => ({}),
  }))

  const { getSharedCookies, translate } = await import('@deeplx/core')
  const result = await translate('Hallo', 'EN', 'DE', {
    cookies: 'via=translate',
  })

  expect(result).toBe('Hello')
  expect(getSharedCookies()).toBe('via=translate')
  expect(mockXfetch).toHaveBeenCalledOnce()
})

test('translate helper passes skipWarm option through to translateByDeepLX', async () => {
  const mockXfetch = vi.fn().mockResolvedValue({
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
  expect(mockXfetch).not.toHaveBeenCalledWith(
    'https://www.deepl.com/translator',
    expect.anything(),
  )
})
