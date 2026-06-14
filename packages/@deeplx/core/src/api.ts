import type { SourceLanguage, TargetLanguage } from './constants.ts'
import { translateByDeepLX } from './translate.ts'

export const translate = async (
  text: string,
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
) => {
  const result = await translateByDeepLX(sourceLang, targetLang, text)
  if ('message' in result) {
    throw new Error(result.message, { cause: result })
  }
  return result.data
}
