import type { SourceLanguage, TargetLanguage } from './constants.ts'
import { translateByDeepLX, type TranslatedText } from './translate.ts'

export interface TranslateOptions {
  dlSession?: string
  proxyUrl?: string
  signal?: AbortSignal
  skipWarm?: boolean
  cookies?: string
}

export const translate = async <T extends string | readonly string[]>(
  text: T,
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  options?: TranslateOptions,
): Promise<TranslatedText<T>> => {
  const { proxyUrl, dlSession, signal, skipWarm, cookies } = options ?? {}
  const result = await translateByDeepLX(
    sourceLang,
    targetLang,
    text,
    proxyUrl,
    dlSession,
    signal,
    skipWarm,
    cookies,
  )

  if ('message' in result) {
    throw new Error(result.message, { cause: result })
  }
  return result.data
}
