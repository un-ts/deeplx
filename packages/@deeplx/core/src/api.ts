import type { SourceLanguage, TargetLanguage } from './constants.ts'
import { translateByDeepLX } from './translate.ts'
import type { DeepLXTranslationResult } from './types.ts'

export interface TranslateOptions {
  dlSession?: string
  proxyUrl?: string
  signal?: AbortSignal
  skipWarm?: boolean
  cookies?: string
}

function unwrapResult<T extends string[] | string>(
  result: DeepLXTranslationResult<T>,
): T {
  if ('message' in result) {
    throw new Error(result.message, { cause: result })
  }
  return result.data
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
  if (typeof text === 'string') {
    return unwrapResult(
      await translateByDeepLX(
        sourceLang,
        targetLang,
        text,
        proxyUrl,
        dlSession,
        signal,
        skipWarm,
        cookies,
      ),
    )
  }
  return unwrapResult(
    await translateByDeepLX(
      sourceLang,
      targetLang,
      text,
      proxyUrl,
      dlSession,
      signal,
      skipWarm,
      cookies,
    ),
  )
}
