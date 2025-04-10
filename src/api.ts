import {
  FORMALITY_TONES,
  type FormalityTone,
  type SourceLanguage,
  type TargetLanguage,
} from './constants.js'
import { translateByDeepLX } from './translate.js'

export const translate = async (
  text: string,
  targetLang: TargetLanguage,
  sourceLang?: SourceLanguage,
  formalityTone?: FormalityTone,
) => {
  if (formalityTone && !FORMALITY_TONES.has(formalityTone)) {
    throw new Error(`Formality tone \`${formalityTone}\` not supported.`)
  }
  const result = await translateByDeepLX(
    sourceLang,
    targetLang,
    text,
    formalityTone,
  )
  if ('message' in result) {
    throw new Error(result.message, { cause: result })
  }
  return result.data
}
