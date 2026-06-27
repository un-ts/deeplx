import { randomUUID } from 'node:crypto'

import { createProxy } from 'node-fetch-native/proxy'
import { ResponseError, xfetch } from 'x-fetch'

import {
  ONESHOT_FREE_ENDPOINT,
  ONESHOT_PRO_ENDPOINT,
  CHROME_EXTENSION_ID,
  CHROME_EXTENSION_VERSION,
  IMPERSONATED_CHROME_MAJOR,
  MAX_FREE_TEXT_LENGTH,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
  HTTP_STATUS_BAD_REQUEST,
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

let sharedCookies = ''
let warmupPromise: Promise<void> | null = null
let cookiesPinned = false

export function getSharedCookies(): string {
  return sharedCookies
}

export function setSharedCookies(cookies: string): void {
  sharedCookies = cookies
  cookiesPinned = true
  warmupPromise = Promise.resolve()
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
      const setCookie = res.headers.get('set-cookie')
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
        if (cookies.length > 0 && !cookiesPinned) {
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
    return { code: status, id: reqId, message: error.message }
  }
  return {
    code: HTTP_STATUS_SERVICE_UNAVAILABLE,
    id: reqId,
    message: String(error),
  }
}

function buildHeaders(dlSession?: string): Record<string, string> {
  const authValue = dlSession ? `Bearer ${dlSession}` : 'None'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    Authorization: authValue,
    Origin: `chrome-extension://${CHROME_EXTENSION_ID}`,
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${IMPERSONATED_CHROME_MAJOR}.0.0.0 Safari/537.36`,
  }
  if (sharedCookies) {
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

  if (cookies) {
    setSharedCookies(cookies)
  } else if (!dlSession && !skipWarm) {
    await warmCookies(proxyUrl)
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
    usage_type: 'Translate',
    app_information: {
      os: 'brex_macOS',
      os_version: `brex_chrome_${IMPERSONATED_CHROME_MAJOR}.0.0.0`,
      app_version: CHROME_EXTENSION_VERSION,
      app_build: 'chrome_web_store',
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
        headers: buildHeaders(dlSession),
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
