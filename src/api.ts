import { ApiMethod, fetchApi, interceptors } from 'x-fetch'

import {
  type SplittedSentences,
  type TranslatedSentences,
  extractTranslatedSentences,
  extractSplitSentences,
} from './extractors.js'
import {
  generateTranslationRequestData,
  generateSplitSentencesRequestData,
} from './generators.js'
import {
  type FormalityTone,
  type SourceLanguage,
  type TargetLanguage,
  API_URL,
  AUTO,
} from './settings.js'
import { abbreviateLanguage } from './utils.js'

const DEFAULT_HEADERS = Object.entries({
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
})

interceptors.use((req, next) => {
  req.method = ApiMethod.POST
  req.headers = DEFAULT_HEADERS
  const body = req.body as ReturnType<typeof generateTranslationRequestData>
  req.body = JSON.stringify(body).replace('"method":"', () => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    if ((body.id + 3) % 13 === 0 || (body.id + 5) % 29 === 0) {
      return '"method" : "'
    }
    return '"method": "'
  })
  return next(req)
})

export function splitSentences(
  text: string,
  sourceLanguage?: SourceLanguage,
  identifier?: number,
) {
  const data = generateSplitSentencesRequestData(
    text,
    sourceLanguage,
    identifier,
  )
  return fetchApi<SplittedSentences>(API_URL, {
    body: data,
  })
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
  formalityTone?: FormalityTone,
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
  return fetchApi<TranslatedSentences>(API_URL, {
    body: data,
  })
}

export async function translate(
  text: null | undefined,
  targetLanguage: TargetLanguage,
  sourceLanguage?: SourceLanguage,
  identifier?: number,
  alternatives?: number,
  formalityTone?: FormalityTone,
): Promise<undefined>
export async function translate(
  text: string,
  targetLanguage: TargetLanguage,
  sourceLanguage?: SourceLanguage,
  identifier?: number,
  alternatives?: number,
  formalityTone?: FormalityTone,
): Promise<string>
export async function translate(
  text: string | null | undefined,
  targetLanguage: TargetLanguage,
  sourceLanguage?: SourceLanguage,
  identifier?: number,
  alternatives?: number,
  formalityTone?: FormalityTone,
): Promise<string | undefined>
export async function translate(
  text: string | null | undefined,
  targetLanguage: TargetLanguage,
  sourceLanguage: SourceLanguage = AUTO,
  identifier?: number,
  alternatives?: number,
  formalityTone?: FormalityTone,
) {
  text = text?.trim()
  if (!text) {
    return text
  }
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
