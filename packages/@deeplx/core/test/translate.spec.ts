import { beforeEach, expect, test, vi } from 'vitest'
import { type xfetch } from 'x-fetch'
// Each test gets a fresh module instance so module-level state is isolated.
beforeEach(() => {
  vi.resetModules()
})

// Every test in this file mocks the same two modules; keep the setup in one
// place so there is a single copy of it.
function setupXfetchMock(
  mockXfetch: unknown,
  ResponseError: unknown = class ResponseError extends Error {},
) {
  vi.doMock('x-fetch', () => ({ xfetch: mockXfetch, ResponseError }))
  vi.doMock('node-fetch-native/proxy', () => ({ createProxy: () => ({}) }))
}

test('getSharedCookies returns empty string initially', async () => {
  const { getSharedCookies } = await import('@deeplx/core')
  expect(getSharedCookies()).toBe('')
})

test('translateByDeepLX with cookies option uses local cookies and skips warmup fetch', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'DE' }],
  })
  setupXfetchMock(mockXfetch)

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
  setupXfetchMock(mockXfetch)

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
  setupXfetchMock(mockXfetch)

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
  setupXfetchMock(mockXfetch)

  const { translate } = await import('@deeplx/core')
  const result = await translate('Hallo', 'EN', 'DE', { skipWarm: true })

  expect(result).toBe('Hello')
  expect(mockXfetch).toHaveBeenCalledOnce()
})

test('translateByDeepLX surfaces the DeepL 403 detail from the response body', async () => {
  class MockResponseError extends Error {
    constructor(
      readonly response: { status: number },
      readonly data?: { title?: string; message?: string },
    ) {
      super(String(response.status))
    }
  }

  const mockXfetch = vi
    .fn<typeof xfetch>()
    // DeepL answers the iOS "ItaClient" outcomes with a title, a message, or
    // neither; each has to fall back in that order.
    .mockRejectedValueOnce(
      new MockResponseError({ status: 403 }, { title: 'OutdatedClient' }),
    )
    .mockRejectedValueOnce(
      new MockResponseError(
        { status: 403 },
        { message: 'AuthenticationFailed' },
      ),
    )
    .mockRejectedValueOnce(new MockResponseError({ status: 403 }))
    // Any other status keeps the plain response-derived message.
    .mockRejectedValueOnce(new MockResponseError({ status: 500 }))

  setupXfetchMock(mockXfetch, MockResponseError)

  const { translateByDeepLX } = await import('@deeplx/core')
  const call = () =>
    translateByDeepLX(
      'DE',
      'EN',
      'Hallo',
      undefined,
      undefined,
      undefined,
      true,
    )

  await expect(call()).resolves.toMatchObject({
    code: 403,
    message: 'OutdatedClient',
  })
  await expect(call()).resolves.toMatchObject({
    code: 403,
    message: 'AuthenticationFailed',
  })
  await expect(call()).resolves.toMatchObject({
    code: 403,
    message:
      'request forbidden by DeepL (auth failed, outdated client, or blocked)',
  })
  await expect(call()).resolves.toMatchObject({ code: 500 })
})

test('source_lang is sent as the generic zh while targets keep their script variants', async () => {
  const mockXfetch = vi.fn<typeof xfetch>().mockResolvedValue({
    translations: [{ text: 'Hello', detected_source_language: 'ZH' }],
  })
  setupXfetchMock(mockXfetch)

  const { translateByDeepLX } = await import('@deeplx/core')
  const lastBody = () =>
    mockXfetch.mock.lastCall?.[1]?.body as Record<string, unknown> | undefined

  // Mirrors OwO-Network/DLX translate/lang_test.go: lowercase inputs too.
  await translateByDeepLX(
    'zh-hant',
    'EN',
    '你好',
    undefined,
    undefined,
    undefined,
    true,
  )
  expect(lastBody()).toMatchObject({ source_lang: 'zh', target_lang: 'en-US' })

  await translateByDeepLX(
    'ZH-HANS',
    'EN',
    '你好',
    undefined,
    undefined,
    undefined,
    true,
  )
  expect(lastBody()).toMatchObject({ source_lang: 'zh' })

  // The target side keeps the script variant, and "auto" still omits the field.
  await translateByDeepLX(
    undefined,
    'zh-hant',
    '你好',
    undefined,
    undefined,
    undefined,
    true,
  )
  expect(lastBody()).toMatchObject({ target_lang: 'zh-Hant' })
  expect(lastBody()?.source_lang).toBeUndefined()
})
