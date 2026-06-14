import { randomUUID } from 'node:crypto'

import { createProxy } from 'node-fetch-native/proxy'
import { xfetch } from 'x-fetch'

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

const instanceID = randomUUID()

let sharedCookies = ''
let warmupPromise: Promise<void> | null = null

async function warmCookies(proxyUrl?: string) {
  if (warmupPromise) {
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

function resolveTargetLang(code: string): string {
  if (!code || code.toLowerCase() === 'auto') {
    throw new Error('target_lang cannot be "auto" or empty')
  }
  const upperCode = code.toUpperCase()
  let mapped = TARGET_LANG_MAP[upperCode]
  if (!mapped) {
    const abbreviated = abbreviateLanguage(code)
    if (abbreviated) {
      mapped = TARGET_LANG_MAP[abbreviated.toUpperCase()]
    }
  }
  if (!mapped) {
    throw new Error(`unsupported target_lang "${code}"`)
  }
  return mapped
}

function resolveSourceLang(code: string | undefined): string | undefined {
  if (!code || code.toLowerCase() === 'auto') {
    return undefined
  }
  const upperCode = code.toUpperCase()
  let mapped = SOURCE_LANG_MAP[upperCode]
  if (!mapped) {
    const abbreviated = abbreviateLanguage(code)
    if (abbreviated) {
      mapped = SOURCE_LANG_MAP[abbreviated.toUpperCase()]
    }
  }
  if (!mapped) {
    throw new Error(`unsupported source_lang "${code}"`)
  }
  return mapped
}

function parseTranslationError(
  error: unknown,
  reqId: number,
): DeepLXTranslationResult {
  let status = HTTP_STATUS_SERVICE_UNAVAILABLE
  let message: string | undefined
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (typeof e.status === 'number') {
      status = e.status
    } else if (e.response && typeof e.response === 'object') {
      const res = e.response as Record<string, unknown>
      if (typeof res.status === 'number') {
        status = res.status
      }
    }
    if (typeof e.message === 'string') {
      message = e.message
    }
  }

  if (status === HTTP_STATUS_TOO_MANY_REQUESTS) {
    return {
      code: HTTP_STATUS_TOO_MANY_REQUESTS,
      id: reqId,
      message:
        "too many requests, your IP has been blocked by DeepL temporarily, please don't request it frequently in a short time",
    }
  }
  return {
    code: status,
    id: reqId,
    message: message ?? String(error),
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
): Promise<DeepLXTranslationResult> => {
  if (!text) {
    return { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' }
  }

  if ([...text].length > MAX_FREE_TEXT_LENGTH) {
    return {
      code: 413, // Payload Too Large
      message: `text exceeds maximum length: ${[...text].length} characters (anonymous oneshot limit is ${MAX_FREE_TEXT_LENGTH})`,
    }
  }

  if (!dlSession) {
    await warmCookies(proxyUrl)
  }

  let resolvedTarget: string
  try {
    resolvedTarget = resolveTargetLang(targetLang)
  } catch (err: unknown) {
    return {
      code: HTTP_STATUS_BAD_REQUEST,
      message: err instanceof Error ? err.message : String(err),
    }
  }

  let resolvedSource: string | undefined
  try {
    resolvedSource = resolveSourceLang(sourceLang)
  } catch (err: unknown) {
    return {
      code: HTTP_STATUS_BAD_REQUEST,
      message: err instanceof Error ? err.message : String(err),
    }
  }

  const reqData: OneshotRequest = {
    text: [text],
    target_lang: resolvedTarget,
    source_lang: resolvedSource,
    usage_type: 'Translate',
    app_information: {
      os: 'brex_macOS',
      os_version: `brex_chrome_${IMPERSONATED_CHROME_MAJOR}.0.0.0`,
      app_version: CHROME_EXTENSION_VERSION,
      app_build: 'chrome_web_store',
      instance_id: instanceID,
    },
  }

  const reqId = Date.now()

  try {
    const response = await xfetch<OneshotResponse | null>(
      dlSession ? ONESHOT_PRO_ENDPOINT : ONESHOT_FREE_ENDPOINT,
      {
        method: 'POST',
        body: JSON.stringify(reqData),
        headers: buildHeaders(dlSession),
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
