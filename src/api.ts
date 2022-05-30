import _got from 'got'

import {
  extractTranslatedSentences,
  extractSplitSentences,
  SplittedSentences,
  TranslatedSentences,
} from './extractors.js'
import {
  generateTranslationRequestData,
  generateSplitSentencesRequestData,
} from './generators.js'
import { API_URL } from './settings.js'
import { abbreviateLanguage } from './utils.js'

const got = _got.extend({
  headers: {
    accept: '*/*',
    'accept-language': 'en-US;q=0.8,en;q=0.7',
    authority: 'www2.deepl.com',
    'content-type': 'application/json',
    origin: 'https://www.deepl.com',
    referer: 'https://www.deepl.com/translator',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Mobile Safari/537.36',
  },
  stringifyJson(object: unknown) {
    return JSON.stringify(object).replace('"method":"', () => {
      const self = object as { id: number }
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if ((self.id + 3) % 13 === 0 || (self.id + 5) % 29 === 0) {
        return '"method" : "'
      }
      return '"method": "'
    })
  },
})

export async function splitIntoSentences(text: string, identifier?: number) {
  const data = generateSplitSentencesRequestData(text, identifier)
  return extractSplitSentences(
    await got
      .post(API_URL, {
        json: data,
      })
      .json<SplittedSentences>(),
  )
}

export async function requestTranslation(
  sourceLanguage: string,
  targetLanguage: string,
  text: string,
  identifier?: number,
  alternatives?: number,
  formalityTone?: 'formal' | 'informal',
) {
  const data = generateTranslationRequestData(
    sourceLanguage,
    targetLanguage,
    await splitIntoSentences(text, identifier),
    identifier,
    alternatives,
    formalityTone,
  )
  return await got
    .post(API_URL, {
      json: data,
    })
    .json<TranslatedSentences>()
}

export async function translate(
  sourceLanguage: string,
  targetLanguage: string,
  text: string,
  identifier?: number,
  alternatives?: number,
  formalityTone?: 'formal' | 'informal',
) {
  return extractTranslatedSentences(
    await requestTranslation(
      abbreviateLanguage(sourceLanguage),
      abbreviateLanguage(targetLanguage),
      text,
      identifier,
      alternatives,
      formalityTone,
    ),
  ).join(' ')
}
