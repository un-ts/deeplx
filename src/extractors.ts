import type { SourceLanguage } from './settings.js'

export interface TranslatedSentences {
  result: {
    translations: Array<{
      beams: Array<{
        postprocessed_sentence: string
      }>
    }>
  }
}

export function extractTranslatedSentences(response: TranslatedSentences) {
  return response.result.translations.reduce<string[]>(
    (sentences, translation) => {
      sentences.push(translation.beams[0].postprocessed_sentence)
      return sentences
    },
    [],
  )
}

export interface SplittedSentences {
  result: {
    splitted_texts: string[][]
    lang: SourceLanguage
  }
}

export function extractSplitSentences(response: SplittedSentences) {
  return response.result.splitted_texts[0]
}
