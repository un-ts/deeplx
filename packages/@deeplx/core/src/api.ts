import type { SourceLanguage, TargetLanguage } from './constants.ts'
import { translateByDeepLX } from './translate.ts'

export const translate = async (
  text: string,
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  formal?: boolean,
) => {
  const result = await translateByDeepLX(sourceLang, targetLang, text, formal)
  if ('message' in result) {
    throw new Error(result.message, { cause: result })
  }
  return result.data
}
