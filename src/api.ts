import type { Got } from 'got'

import {
  extractTranslatedSentences,
  extractSplitSentences,
  SplittedSentences,
  type TranslatedSentences,
} from './extractors.js'
import {
  generateTranslationRequestData,
  generateSplitSentencesRequestData,
} from './generators.js'
import {
  API_URL,
  AUTO,
  type SourceLanguage,
  type TargetLanguage,
} from './settings.js'
import { abbreviateLanguage, importEsm } from './utils.js'

let _got: Got | undefined

async function getGot() {
  if (!_got) {
    const got = await importEsm<typeof import('got')>('got')
    _got = got.default.extend({
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
  }
  return _got
}

export async function splitSentences(
  text: string,
  sourceLanguage?: SourceLanguage,
  identifier?: number,
) {
  const data = generateSplitSentencesRequestData(
    text,
    sourceLanguage,
    identifier,
  )
  const got = await getGot()
  return await got
    .post(API_URL, {
      json: data,
    })
    .json<SplittedSentences>()
}

export async function splitIntoSentences(
  text: string,
  sourceLanguage?: SourceLanguage,
  identifier?: number,
) {
  return extractSplitSentences(
    await splitSentences(text, sourceLanguage, identifier),
  )
}

export async function requestTranslation(
  text: string,
  targetLanguage: TargetLanguage,
  sourceLanguage: SourceLanguage,
  identifier?: number,
  alternatives?: number,
  formalityTone?: 'formal' | 'informal',
) {
  const res = await splitSentences(text, sourceLanguage, identifier)
  const data = generateTranslationRequestData(
    sourceLanguage === 'auto' ? res.result.lang : sourceLanguage,
    targetLanguage,
    extractSplitSentences(res),
    identifier,
    alternatives,
    formalityTone,
  )
  const got = await getGot()
  return await got
    .post(API_URL, {
      json: data,
    })
    .json<TranslatedSentences>()
}

export async function translate(
  text: string,
  targetLanguage: TargetLanguage,
  sourceLanguage: SourceLanguage = AUTO,
  identifier?: number,
  alternatives?: number,
  formalityTone?: 'formal' | 'informal',
) {
  return extractTranslatedSentences(
    await requestTranslation(
      text,
      abbreviateLanguage(targetLanguage)!,
      abbreviateLanguage(sourceLanguage) ?? 'auto',
      identifier,
      alternatives,
      formalityTone,
    ),
  ).join(' ')
}
