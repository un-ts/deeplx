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
): DeepLXTranslationErrorResult {
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
  // short or long `translations` array would silently shift every later segment,
  // so the whole call fails instead of returning misaligned data.
  if (aligned && translations?.length !== textCount) {
    const count = translations?.length ?? 0
    const message = `translation count mismatch: expected ${textCount} translations, got ${count}`
    throw new Error(message, {
      cause: { code: HTTP_STATUS_SERVICE_UNAVAILABLE, message },
    })
  }

  // A single text keeps resolving to the service-unavailable result when the
  // endpoint answers without any translation at all.
  if (!translations?.length) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  // A single text keeps reading only the first translation, exactly as before;
  // a batch must not hold a placeholder for a segment DeepL did not translate.
  // The body is wire data, so an entry can be null or malformed even though the
  // type says otherwise: read each text defensively, and treat anything missing,
  // empty or not a string as a failed translation rather than throwing.
  const data: string[] = []
  for (const entry of translations.slice(0, textCount)) {
    const text = (entry as OneshotTranslation | null)?.text
    if (typeof text !== 'string' || !text) {
      return {
        code: HTTP_STATUS_SERVICE_UNAVAILABLE,
        id: reqId,
        message: 'Translation failed',
      }
    }
    data.push(text)
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
 * The positions of the texts that carry something to translate, and their total
 * length. A blank text — empty, or nothing but whitespace — carries nothing, so
 * it is not sent and `mergeTranslations` answers it with itself, exactly as the
 * server-side `/translate` does in its own `textsToTranslate`.
 */
function textsToTranslate(texts: readonly string[]): {
  positions: number[]
  totalLength: number
} {
  const positions: number[] = []
  let totalLength = 0
  for (const [index, text] of texts.entries()) {
    if (text.trim() === '') {
      continue
    }
    positions.push(index)
    totalLength += text.length
  }
  return { positions, totalLength }
}

/**
 * Puts the translations back at the positions they were asked for, leaving every
 * text that was not sent — a blank one — exactly as it arrived.
 */
function mergeTranslations(
  texts: readonly string[],
  positions: readonly number[],
  translations: readonly string[],
): string[] {
  const merged = [...texts]
  for (const [index, position] of positions.entries()) {
    merged[position] = translations[index]
  }
  return merged
}

/**
 * A single-text caller keeps the original `data: string` shape; a batch with
 * blank segments gets those positions back.
 */
function finalizeResult<T extends string | readonly string[]>(
  result: DeepLXTranslationResult<string[]>,
  texts: readonly string[],
  positions: readonly number[],
  isBatch: boolean,
): DeepLXTranslationResult<TranslatedText<T>> {
  if (!('data' in result)) {
    return result
  }
  const data = mergeTranslations(texts, positions, result.data)
  const shaped = isBatch ? { ...result, data } : { ...result, data: data[0] }
  // `T` is the caller's input shape, and the branch above is what picked it.
  return shaped as DeepLXTranslationResult<TranslatedText<T>>
}

/**
 * The answer follows the shape of the text it was asked about: one string in, a
 * result whose `data` is a string; a list in, one whose `data` is a list.
 */
export type TranslatedText<T extends string | readonly string[]> =
  T extends string ? string : string[]

export const translateByDeepLX = async <T extends string | readonly string[]>(
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  text: T,
  proxyUrl?: string,
  dlSession?: string,
  signal?: AbortSignal,
  skipWarm?: boolean,
  cookies?: string,
): Promise<DeepLXTranslationResult<TranslatedText<T>>> => {
  // A single text is the one-element case of a batch; the input shape is the
  // caller's to get right, and it decides the shape of `data` below.
  const isBatch = typeof text !== 'string'
  const texts = isBatch ? [...text] : [text]

  // Nothing about emptiness is an error: a blank text (empty or whitespace
  // only) is not sent and is answered with itself, so the positions of a
  // segmented document stay aligned, and an empty list is answered with an
  // empty list. The same pass gives the total length of what travels.
  const { positions, totalLength } = textsToTranslate(texts)

  // The languages are resolved first, exactly as the server-side `/translate`
  // does, so an unsupported one is refused before the cap is even looked at.
  const targetResult = resolveLang(targetLang, 'target')
  if (!targetResult.success) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: targetResult.error }
  }

  const sourceResult = resolveLang(sourceLang, 'source')
  if (!sourceResult.success) {
    return { code: HTTP_STATUS_BAD_REQUEST, message: sourceResult.error }
  }

  // The anonymous oneshot endpoint caps the *sum* of all `text` items, so a
  // batch has to be chunked by total length, not by segment count. Blank texts
  // are not charged against the cap, because they are never sent.
  //
  // The count is in UTF-16 code units (`String.prototype.length`), not code
  // points: probed live, 750 emoji (1500 units) is accepted while 751 (1502
  // units) is a 400, and 2400-byte CJK text is accepted, so neither bytes nor
  // code points nor display columns are the unit.
  if (totalLength > MAX_FREE_TEXT_LENGTH) {
    return {
      code: HTTP_STATUS_PAYLOAD_TOO_LARGE, // Payload Too Large
      message: `text exceeds maximum length: ${totalLength} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH})`,
    }
  }

  if (positions.length === 0) {
    // There is nothing to ask the endpoint about: mirror the request back.
    return finalizeResult<T>(
      {
        code: HTTP_STATUS_OK,
        id: Date.now(),
        data: texts,
        alternatives: [],
        sourceLang: sourceLang || 'auto',
        targetLang,
        method: dlSession ? 'Pro' : 'Free',
      },
      texts,
      positions,
      isBatch,
    )
  }

  // The texts that travel: oneshot's `text` field holds just the non-blank ones.
  const payload = positions.map(position => texts[position])

  let requestCookies = cookies
  if (!requestCookies && !dlSession && !skipWarm) {
    await warmCookies(proxyUrl)
    requestCookies = sharedCookies
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
  return finalizeResult<T>(
    processTranslationResponse(
      response,
      reqId,
      sourceLang,
      targetLang,
      dlSession,
      positions.length,
      isBatch,
    ),
    texts,
    positions,
    isBatch,
  )
}
