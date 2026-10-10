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
  const translations = response?.translations

  // A batch response has to line up one-to-one with the request: a missing,
  // short or long `translations` array would silently shift every later
  // segment, so the whole call fails instead of returning misaligned data.
  if (aligned && translations?.length !== textCount) {
    const message = `translation count mismatch: expected ${textCount} translations, got ${translations?.length ?? 0}`
    throw new Error(message, {
      cause: { code: HTTP_STATUS_SERVICE_UNAVAILABLE, message },
    })
  }

  // A single text keeps resolving to the service-unavailable result when the
  // endpoint answers without any translation at all.
  if (!translations || translations.length === 0) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  // A single text keeps reading only the first translation, exactly as before;
  // a batch must not hold a placeholder for a segment DeepL did not translate.
  const data = translations
    .slice(0, textCount)
    .map(translation => translation.text)
  if (data.some(translation => !translation)) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  const mainTranslation = translations[0]
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

/**
 * Cookies for one request: explicit ones win, a Pro session or an explicit
 * `skipWarm` avoids the warm-up, and everything else warms the shared jar first.
 */
async function resolveRequestCookies(
  cookies: string | undefined,
  dlSession: string | undefined,
  proxyUrl: string | undefined,
  skipWarm: boolean | undefined,
): Promise<string | undefined> {
  if (cookies || dlSession || skipWarm) {
    return cookies
  }
  await warmCookies(proxyUrl)
  return sharedCookies
}

/**
 * A batch needs at least one translatable text to ask the endpoint about. An
 * empty array, or one whose segments are all blank, has nothing to translate,
 * so the call fails as a whole instead of resolving to a success nobody
 * requested.
 *
 * A blank segment (empty or whitespace-only) is not rejected, and it is not
 * sent either: `restoreBlankSegments` answers it locally with the original
 * text — the translation of whitespace is that whitespace — which keeps the
 * positions of a segmented document aligned and spares the endpoint a segment
 * with nothing to translate.
 */
function batchPayload(texts: readonly string[]): string[] {
  if (texts.every(value => value.trim() === '')) {
    throw new Error('No text to translate', {
      cause: { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' },
    })
  }
  return texts.filter(value => value.trim() !== '')
}

/**
 * The blank segments were never sent, so put them back where they came from —
 * unchanged, since there is nothing to translate in them — and keep the
 * translated segments in order.
 */
function restoreBlankSegments(
  texts: readonly string[],
  data: readonly string[],
): string[] {
  let sent = 0
  return texts.map(value => {
    if (value.trim() === '') {
      return value
    }
    const translation = data[sent]
    sent += 1
    return translation
  })
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

  // A blank segment is not a request: it is answered locally with its own text
  // (there is nothing to translate in it), so the positions of a segmented
  // document stay aligned and the endpoint is only asked about real text. A
  // single empty string keeps its own "no text to translate" result below.
  const payload = isBatch ? batchPayload(texts) : texts

  if (!isBatch && !text) {
    return { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' }
  }

  // The anonymous oneshot endpoint caps the *sum* of all `text` items, so a
  // batch has to be chunked by total length, not by segment count.
  //
  // The endpoint counts UTF-16 code units (`String.prototype.length`), not code
  // points: probed live, 750 emoji (1500 units) is accepted while 751 (1502
  // units) is a 400, and 2400-byte CJK text is accepted, so neither bytes nor
  // code points nor display columns are the unit. Keep `item.length`.
  const totalLength = payload.reduce((length, item) => length + item.length, 0)
  if (totalLength > MAX_FREE_TEXT_LENGTH) {
    return {
      code: HTTP_STATUS_PAYLOAD_TOO_LARGE, // Payload Too Large
      message: isBatch
        ? `texts exceed maximum total length: ${totalLength} characters across ${texts.length} texts (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units per request)`
        : `text exceeds maximum length: ${totalLength} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units)`,
    }
  }

  const requestCookies = await resolveRequestCookies(
    cookies,
    dlSession,
    proxyUrl,
    skipWarm,
  )

  const targetResult = resolveLang(targetLang, 'target')
  if (!targetResult.success) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: targetResult.error }
  }

  const sourceResult = resolveLang(sourceLang, 'source')
  if (!sourceResult.success) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: sourceResult.error }
  }

  const reqData: OneshotRequest = {
    text: payload,
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
    payload.length,
    isBatch,
  )

  if (!('data' in result)) {
    return result
  }

  // A single-text caller keeps the original `data: string` shape.
  if (!isBatch) {
    return { ...result, data: result.data[0] }
  }

  if (payload.length === texts.length) {
    return result
  }

  return { ...result, data: restoreBlankSegments(texts, result.data) }
}
