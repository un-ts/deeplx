import type { SourceLanguage, TargetLanguage } from './constants.ts'
import { translateByDeepLX } from './translate.ts'

export interface TranslateOptions {
  dlSession?: string
  proxyUrl?: string
  signal?: AbortSignal
}

export const translate = async (
  text: string,
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  options?: TranslateOptions,
) => {
  const result = await translateByDeepLX(
    sourceLang,
    targetLang,
    text,
    options?.proxyUrl,
    options?.dlSession,
    options?.signal,
  )
  if ('message' in result) {
    throw new Error(result.message, { cause: result })
  }
  return result.data
}
