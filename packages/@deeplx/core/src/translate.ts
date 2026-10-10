import { randomUUID } from 'node:crypto'

import { createProxy } from 'node-fetch-native/proxy'
import { isXFetchError, xfetch } from 'x-fetch'

import {
  ONESHOT_FREE_ENDPOINT,
  ONESHOT_PRO_ENDPOINT,
  IOS_APP_BUILD,
  IOS_APP_VERSION,
  IOS_CFNETWORK_VERSION,
  IOS_DARWIN_VERSION,
  IOS_OS_VERSION,
  MAX_FREE_TEXT_LENGTH,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_PAYLOAD_TOO_LARGE,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  TARGET_LANG_MAP,
  SOURCE_LANG_MAP,
  type SourceLanguage,
  type TargetLanguage,
} from './constants.ts'
import type {
  DeepLXBatchTranslationResult,
  DeepLXTranslationResult,
  OneshotRequest,
  OneshotResponse,
} from './types.ts'
import { abbreviateLanguage } from './utils.ts'

let instanceID_: string | undefined
function getInstanceID(): string {
  // eslint-disable-next-line sonarjs/no-nested-assignment
  return (instanceID_ ??= randomUUID())
}

// Sent as `x-app-session-id`; stable for the process lifetime and independent
// of the instance ID, like the iOS app.
let sessionID_: string | undefined
function getSessionID(): string {
  // eslint-disable-next-line sonarjs/no-nested-assignment
  return (sessionID_ ??= randomUUID())
}

let sharedCookies = ''
let warmupPromise: Promise<void> | null = null
export function getSharedCookies(): string {
  return sharedCookies
}

async function warmCookies(proxyUrl?: string) {
  if (warmupPromise !== null) {
    return warmupPromise
  }
  warmupPromise = (async () => {
    try {
      const res = await xfetch('https://www.deepl.com/translator', {
        type: null,
        ...createProxy({ url: proxyUrl }),
      })
      const setCookie =
        // `Set-Cookie` is a forbidden response header name, and `getSetCookie()`
        // is unavailable on some supported runtimes (before Node 18.14).
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        res.headers.getSetCookie?.().join('; ') ?? res.headers.get('set-cookie')
      if (setCookie) {
        const cookies: string[] = []
        const userCountryMatch = /userCountry=[^;]+/.exec(setCookie)
        if (userCountryMatch) {
          cookies.push(userCountryMatch[0])
        }
        const verifiedBotMatch = /verifiedBot=[^;]+/.exec(setCookie)
        if (verifiedBotMatch) {
          cookies.push(verifiedBotMatch[0])
        }
        if (cookies.length > 0) {
          sharedCookies = cookies.join('; ')
        }
      }
    } catch {
      warmupPromise = null
      // ignore warmup errors
    }
  })()
  return warmupPromise
}

type ResolveResult<T> =
  { success: false; error: string } | { success: true; value: T }

function resolveLang(code: string, kind: 'target'): ResolveResult<string>
function resolveLang(
  code: string | undefined,
  kind: 'source',
): ResolveResult<string | undefined>
function resolveLang(
  code: string | undefined,
  kind: 'source' | 'target',
): ResolveResult<string | undefined> {
  if (!code || code.toLowerCase() === 'auto') {
    if (kind === 'target') {
      return { success: false, error: 'target_lang cannot be "auto" or empty' }
    }
    return { success: true, value: undefined }
  }
  const langMap = kind === 'target' ? TARGET_LANG_MAP : SOURCE_LANG_MAP
  const upperCode = code.toUpperCase()
  let mapped = langMap[upperCode]
  if (!mapped) {
    const abbreviated = abbreviateLanguage(code)
    if (abbreviated) {
      mapped = langMap[abbreviated.toUpperCase()]
    }
  }
  if (!mapped) {
    return { success: false, error: `unsupported ${kind}_lang "${code}"` }
  }
  return { success: true, value: mapped }
}

function parseTranslationError(
  error: unknown,
  reqId: number,
): DeepLXTranslationResult {
  // `x-fetch` wraps transport failures, non-2xx responses and unparseable
  // bodies alike in `XFetchError`; only an error status carries DeepL's detail.
  if (isXFetchError<{ title?: string; message?: string }>(error)) {
    const { response } = error
    if (response && !response.ok) {
      const status = response.status
      if (status === HTTP_STATUS_TOO_MANY_REQUESTS) {
        return { code: status, id: reqId, message: 'too many requests, ...' }
      }
      if (status === HTTP_STATUS_FORBIDDEN) {
        // iOS surfaces this as Forbidden / AuthenticationFailed /
        // OutdatedClient / UserBlocked depending on the body; collapse to 403
        // with any detail.
        const { data } = error
        return {
          code: status,
          id: reqId,
          message:
            data?.title ||
            data?.message ||
            'request forbidden by DeepL (auth failed, outdated client, or blocked)',
        }
      }
      return { code: status, id: reqId, message: error.message }
    }
  }
  return {
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    id: reqId,
    message: String(error),
  }
}

function buildHeaders(
  dlSession?: string,
  requestCookies?: string,
): Record<string, string> {
  const authValue = dlSession ? `Bearer ${dlSession}` : 'None'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    // URLSession defaults for a data task.
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    Authorization: authValue,
    // URLSession product-style User-Agent: CFBundleName/short version +
    // CFNetwork + Darwin. Do not invent alternate formats (e.g. embedding the
    // bundle ID) — a mismatched UA is a cheap ban signal.
    'User-Agent': `DeepL/${IOS_APP_VERSION} CFNetwork/${IOS_CFNETWORK_VERSION} Darwin/${IOS_DARWIN_VERSION}`,
    // ClientInfos.appHeaders — only these three x-app-* keys exist in the iOS
    // binary.
    'x-app-os-version': IOS_OS_VERSION,
    'x-app-instance-id': getInstanceID(),
    'x-app-session-id': getSessionID(),
  }
  if (requestCookies) {
    headers['Cookie'] = requestCookies
  } else if (sharedCookies) {
    headers['Cookie'] = sharedCookies
  }
  return headers
}

function processTranslationResponse(
  response: OneshotResponse | null,
  reqId: number,
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  dlSession: string | undefined,
  textCount: number,
  aligned: boolean,
): DeepLXTranslationResult<string[]> {
  if (!response?.translations || response.translations.length === 0) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  // A batch response has to line up one-to-one with the request: a short or
  // long `translations` array would silently shift every later segment, so the
  // whole call fails instead of returning misaligned data.
  if (aligned && response.translations.length !== textCount) {
    const message = `translation count mismatch: expected ${textCount} translations, got ${response.translations.length}`
    throw new Error(message, {
      cause: { code: HTTP_STATUS_SERVICE_UNAVAILABLE, message },
    })
  }

  // A single text keeps reading only the first translation, exactly as before;
  // a batch must not hold a placeholder for a segment DeepL did not translate.
  const data = response.translations
    .slice(0, textCount)
    .map(translation => translation.text)
  if (data.some(translation => !translation)) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  const mainTranslation = response.translations[0]
  const detectedLang = mainTranslation.detected_source_language
    ? (mainTranslation.detected_source_language.toUpperCase() as SourceLanguage)
    : sourceLang || 'auto'

  return {
    code: HTTP_STATUS_OK,
    id: reqId,
    data,
    alternatives: [],
    sourceLang: detectedLang,
    targetLang,
    method: dlSession ? 'Pro' : 'Free',
  }
}

export function translateByDeepLX(
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  text: string,
  proxyUrl?: string,
  dlSession?: string,
  signal?: AbortSignal,
  skipWarm?: boolean,
  cookies?: string,
): Promise<DeepLXTranslationResult>
export function translateByDeepLX(
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  text: readonly string[],
  proxyUrl?: string,
  dlSession?: string,
  signal?: AbortSignal,
  skipWarm?: boolean,
  cookies?: string,
): Promise<DeepLXBatchTranslationResult>
export async function translateByDeepLX(
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  text: string | readonly string[],
  proxyUrl?: string,
  dlSession?: string,
  signal?: AbortSignal,
  skipWarm?: boolean,
  cookies?: string,
): Promise<DeepLXBatchTranslationResult | DeepLXTranslationResult> {
  const isBatch = typeof text !== 'string'
  // A single text is the one-element case of a batch; only the response shape
  // and the failure modes differ between the two.
  const texts = typeof text === 'string' ? [text] : [...text]

  if (isBatch) {
    // An empty batch has no position to return a translation for; fail the
    // whole call instead of resolving to a success with an empty array.
    if (texts.length === 0) {
      throw new Error('No text to translate', {
        cause: { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' },
      })
    }
  } else if (!text) {
    return { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' }
  }

  // The anonymous oneshot endpoint caps the *sum* of all `text` items, so a
  // batch has to be chunked by total length, not by segment count.
  const totalLength = texts.reduce(
    (length, item) => length + [...item].length,
    0,
  )
  if (totalLength > MAX_FREE_TEXT_LENGTH) {
    return {
      code: HTTP_STATUS_PAYLOAD_TOO_LARGE, // Payload Too Large
      message: isBatch
        ? `texts exceed maximum total length: ${totalLength} characters across ${texts.length} texts (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} per request)`
        : `text exceeds maximum length: ${totalLength} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH})`,
    }
  }

  let requestCookies = cookies
  if (!requestCookies && !dlSession && !skipWarm) {
    await warmCookies(proxyUrl)
    requestCookies = sharedCookies
  }

  const targetResult = resolveLang(targetLang, 'target')
  if (!targetResult.success) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: targetResult.error }
  }

  const sourceResult = resolveLang(sourceLang, 'source')
  if (!sourceResult.success) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: sourceResult.error }
  }

  const reqData: OneshotRequest = {
    text: texts,
    target_lang: targetResult.value,
    source_lang: sourceResult.value,
    usage_type: 'translate',
    app_information: {
      os: 'iOS',
      os_version: IOS_OS_VERSION,
      app_version: IOS_APP_VERSION,
      app_build: IOS_APP_BUILD,
      instance_id: getInstanceID(),
    },
  }

  const reqId = Date.now()

  let response: OneshotResponse | null
  try {
    response = await xfetch<OneshotResponse | null>(
      dlSession ? ONESHOT_PRO_ENDPOINT : ONESHOT_FREE_ENDPOINT,
      {
        method: 'POST',
        body: reqData,
        headers: buildHeaders(dlSession, requestCookies),
        signal,
        ...createProxy({ url: proxyUrl }),
      },
    )
  } catch (error: unknown) {
    return parseTranslationError(error, reqId)
  }

  // Deliberately outside the transport `try`: a misaligned batch throws instead
  // of being reported as a request failure.
  const result = processTranslationResponse(
    response,
    reqId,
    sourceLang,
    targetLang,
    dlSession,
    texts.length,
    isBatch,
  )

  if (isBatch || !('data' in result)) {
    return result
  }

  // A single-text caller keeps the original `data: string` shape.
  return { ...result, data: result.data[0] }
}
