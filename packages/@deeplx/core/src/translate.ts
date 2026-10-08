import { randomUUID } from 'node:crypto'

import { createProxy } from 'node-fetch-native/proxy'
import { ResponseError, xfetch } from 'x-fetch'

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
  | { success: false; error: string }
  | { success: true; value: T }

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
  if (error instanceof ResponseError) {
    const status = error.response.status
    if (status === HTTP_STATUS_TOO_MANY_REQUESTS) {
      return { code: status, id: reqId, message: 'too many requests, ...' }
    }
    if (status === HTTP_STATUS_FORBIDDEN) {
      // iOS surfaces this as Forbidden / AuthenticationFailed / OutdatedClient
      // / UserBlocked depending on the body; collapse to 403 with any detail.
      const { data } = error as ResponseError<{
        title?: string
        message?: string
      }>
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
  dlSession?: string,
): DeepLXTranslationResult {
  if (!response?.translations || response.translations.length === 0) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  const mainTranslation = response.translations[0]
  if (!mainTranslation.text) {
    return {
      code: HTTP_STATUS_SERVICE_UNAVAILABLE,
      id: reqId,
      message: 'Translation failed',
    }
  }

  const detectedLang = mainTranslation.detected_source_language
    ? (mainTranslation.detected_source_language.toUpperCase() as SourceLanguage)
    : sourceLang || 'auto'

  return {
    code: HTTP_STATUS_OK,
    id: reqId,
    data: mainTranslation.text,
    alternatives: [],
    sourceLang: detectedLang,
    targetLang,
    method: dlSession ? 'Pro' : 'Free',
  }
}

export const translateByDeepLX = async (
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  text: string,
  proxyUrl?: string,
  dlSession?: string,
  signal?: AbortSignal,
  skipWarm?: boolean,
  cookies?: string,
): Promise<DeepLXTranslationResult> => {
  if (!text) {
    return { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' }
  }

  if ([...text].length > MAX_FREE_TEXT_LENGTH) {
    return {
      code: HTTP_STATUS_PAYLOAD_TOO_LARGE, // Payload Too Large
      message: `text exceeds maximum length: ${[...text].length} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH})`,
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
    text: [text],
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

  try {
    const response = await xfetch<OneshotResponse | null>(
      dlSession ? ONESHOT_PRO_ENDPOINT : ONESHOT_FREE_ENDPOINT,
      {
        method: 'POST',
        body: reqData,
        headers: buildHeaders(dlSession, requestCookies),
        signal,
        ...createProxy({ url: proxyUrl }),
      },
    )

    return processTranslationResponse(
      response,
      reqId,
      sourceLang,
      targetLang,
      dlSession,
    )
  } catch (error: unknown) {
    return parseTranslationError(error, reqId)
  }
}
