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
  DeepLXTranslationErrorResult,
  DeepLXTranslationResult,
  OneshotRequest,
  OneshotResponse,
  OneshotTranslation,
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

/** The result both the single-text and the batch path use for a broken answer. */
function failedTranslation(reqId: number): DeepLXTranslationResult<string[]> {
  return {
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    id: reqId,
    message: 'Translation failed',
  }
}

/**
 * A batch response has to line up one-to-one with the request: a missing, short
 * or long `translations` array would silently shift every later segment, so the
 * whole call fails instead of returning misaligned data.
 */
function assertAligned(
  translations: readonly OneshotTranslation[] | undefined,
  textCount: number,
): void {
  if (translations?.length !== textCount) {
    const count = translations?.length ?? 0
    const message = `translation count mismatch: expected ${textCount} translations, got ${count}`
    throw new Error(message, {
      cause: { code: HTTP_STATUS_SERVICE_UNAVAILABLE, message },
    })
  }
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

  if (aligned) {
    assertAligned(translations, textCount)
  }

  // A single text keeps resolving to the service-unavailable result when the
  // endpoint answers without any translation at all.
  if (!translations?.length) {
    return failedTranslation(reqId)
  }

  // A single text keeps reading only the first translation, exactly as before;
  // a batch must not hold a placeholder for a segment DeepL did not translate.
  const data = translations
    .slice(0, textCount)
    .map(translation => translation.text)
  if (data.some(translation => !translation)) {
    return failedTranslation(reqId)
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
 * The texts the endpoint has to translate: a blank one (empty or whitespace
 * only) carries nothing, so it is not sent and is answered with itself by
 * `restoreBlankSegments`. Nothing about emptiness is an error — an empty list is
 * answered with an empty list — which is what the server-side sibling does too.
 */
function textsToTranslate(texts: readonly string[]): string[] {
  return texts.filter(value => value.trim() !== '')
}

/** The success result for a request the endpoint never had to see. */
function localResult(
  texts: readonly string[],
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  dlSession: string | undefined,
): DeepLXTranslationResult<string[]> {
  return {
    code: HTTP_STATUS_OK,
    id: Date.now(),
    data: [...texts],
    alternatives: [],
    sourceLang: sourceLang || 'auto',
    targetLang,
    method: dlSession ? 'Pro' : 'Free',
  }
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

/**
 * The endpoint caps the *sum* of all `text` items in one request. The count is
 * in UTF-16 code units (`String.prototype.length`), not code points: probed
 * live, 750 emoji (1500 units) is accepted while 751 (1502 units) is a 400, and
 * 2400-byte CJK text is accepted, so neither bytes, code points nor display
 * columns are the unit.
 */
function lengthError(
  totalLength: number,
  textCount: number,
  isBatch: boolean,
): DeepLXTranslationErrorResult | undefined {
  if (totalLength <= MAX_FREE_TEXT_LENGTH) {
    return undefined
  }
  return {
    code: HTTP_STATUS_PAYLOAD_TOO_LARGE, // Payload Too Large
    message: isBatch
      ? `texts exceed maximum total length: ${totalLength} characters across ${textCount} texts (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units per request)`
      : `text exceeds maximum length: ${totalLength} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH} UTF-16 code units)`,
  }
}

/** Resolve both languages, or the error the caller has to return. */
function resolveLanguages(
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
): { error: string } | { source?: string; target: string } {
  const targetResult = resolveLang(targetLang, 'target')
  if (!targetResult.success) {
    return { error: targetResult.error }
  }
  const sourceResult = resolveLang(sourceLang, 'source')
  if (!sourceResult.success) {
    return { error: sourceResult.error }
  }
  return { source: sourceResult.value, target: targetResult.value }
}

/**
 * A single-text caller keeps the original `data: string` shape; a batch whose
 * payload skipped blank segments gets those positions back.
 */
function finalizeResult(
  result: DeepLXTranslationResult<string[]>,
  texts: readonly string[],
  payload: readonly string[],
  isBatch: boolean,
): DeepLXBatchTranslationResult | DeepLXTranslationResult {
  if (!('data' in result)) {
    return result
  }
  if (!isBatch) {
    return { ...result, data: result.data[0] }
  }
  if (payload.length === texts.length) {
    return result
  }
  return { ...result, data: restoreBlankSegments(texts, result.data) }
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

  // Nothing about emptiness is an error: a blank text (empty or whitespace
  // only) is not sent and is answered with itself, so the positions of a
  // segmented document stay aligned, and an empty list is answered with an
  // empty list.
  const payload = textsToTranslate(texts)

  // The anonymous oneshot endpoint caps the *sum* of all `text` items, so a
  // batch has to be chunked by total length, not by segment count. Blank texts
  // are not charged against the cap, because they are never sent.
  const totalLength = payload.reduce((length, item) => length + item.length, 0)
  const tooLong = lengthError(totalLength, texts.length, isBatch)
  if (tooLong) {
    return tooLong
  }

  const languages = resolveLanguages(sourceLang, targetLang)
  if ('error' in languages) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: languages.error }
  }

  if (payload.length === 0) {
    // There is nothing to ask the endpoint about: mirror the request back.
    return finalizeResult(
      localResult(texts, sourceLang, targetLang, dlSession),
      texts,
      payload,
      isBatch,
    )
  }

  const requestCookies = await resolveRequestCookies(
    cookies,
    dlSession,
    proxyUrl,
    skipWarm,
  )

  const reqData: OneshotRequest = {
    text: payload,
    target_lang: languages.target,
    source_lang: languages.source,
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
  return finalizeResult(
    processTranslationResponse(
      response,
      reqId,
      sourceLang,
      targetLang,
      dlSession,
      payload.length,
      isBatch,
    ),
    texts,
    payload,
    isBatch,
  )
}
