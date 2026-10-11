import type { SourceLanguage, TargetLanguage } from './constants.ts'
import { translateByDeepLX } from './translate.ts'

export interface TranslateOptions {
  dlSession?: string
  proxyUrl?: string
  signal?: AbortSignal
  skipWarm?: boolean
  cookies?: string
}

export function translate(
  text: string,
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  options?: TranslateOptions,
): Promise<string>
export function translate(
  text: readonly string[],
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  options?: TranslateOptions,
): Promise<string[]>
export async function translate(
  text: string | readonly string[],
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  options?: TranslateOptions,
): Promise<string[] | string> {
  const { proxyUrl, dlSession, signal, skipWarm, cookies } = options ?? {}
  // `translateByDeepLX` is overloaded, so the union picks one of them: the value
  // keeps its runtime shape and both results carry the `data` read here.
  const result = await translateByDeepLX(
    sourceLang,
    targetLang,
    text as readonly string[],
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
