import { createProxy } from 'node-fetch-native/proxy'
import { detectLang } from 'whatlang-node'
import { xfetch } from 'x-fetch'

import {
  API_URL,
  COMMON_HEADERS,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
  type SourceLanguage,
  type SupportedCode,
  type TargetLanguage,
} from './constants.ts'
import type {
  DeepLXTranslationResult,
  Job,
  PostData,
  Translation,
  TranslationResponse,
} from './types.ts'
import {
  abbreviateLanguage,
  formatPostString,
  getICount,
  getRandomNumber,
  getTimeStamp,
} from './utils.ts'

// makeRequest makes an HTTP request to DeepL API
const makeRequest = async (
  postData: PostData,
  proxyUrl?: string,
  dlSession?: string,
) => {
  return xfetch<TranslationResponse>(API_URL, {
    method: 'POST',
    body: formatPostString(postData),
    headers: dlSession
      ? { ...COMMON_HEADERS, Cookie: `dl_session=${dlSession}` }
      : COMMON_HEADERS,
    ...createProxy({ url: proxyUrl }),
  })
}

const splitAndProcess = (text: string): string[] =>
  text.split('\n').map(line => (line.trim() === '' ? '\n' : line))

export const translateByDeepLX = async (
  sourceLang: SourceLanguage | undefined,
  targetLang: TargetLanguage,
  text: string,
  formal?: boolean,
  tagHandling = 'plaintext',
  proxyUrl?: string,
  dlSession?: string,
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<DeepLXTranslationResult> => {
  if (!text) {
    return { code: HTTP_STATUS_NOT_FOUND, message: 'No text to translate' }
  }

  // Split text by newlines and store them for later reconstruction
  const textParts = splitAndProcess(text)
  const translatedParts: string[] = []
  const allAlternatives: string[][] = [] // Store alternatives for each part

  for (const part of textParts) {
    if (!part.trim()) {
      translatedParts.push('')
      allAlternatives.push([''])
      continue
    }

    // Get detected language if source language is auto
    if (!sourceLang || sourceLang === 'auto') {
      sourceLang = detectLang(part, true) as SourceLanguage
    }

    const sourceLangCode =
      abbreviateLanguage(sourceLang) ??
      (sourceLang.toUpperCase() as SupportedCode)

    // Prepare jobs from split result
    const jobs: Job[] = [
      {
        kind: 'default',
        preferred_num_beams: 4,
        raw_en_context_before: [],
        raw_en_context_after: [],
        sentences: [{ prefix: '', text: part, id: 0 }],
      },
    ]

    let hasRegionalVariant = false
    let targetLangCode =
      abbreviateLanguage(targetLang) ??
      (targetLang.toUpperCase() as SupportedCode)
    const targetLangParts = targetLang.split('-')
    if (targetLangParts.length > 1) {
      targetLangCode = targetLangParts[0] as SupportedCode
      hasRegionalVariant = true
    }

    // Prepare translation request
    const id = getRandomNumber()

    const postData: PostData = {
      jsonrpc: '2.0',
      method: 'LMT_handle_jobs',
      id,
      params: {
        commonJobParams: {
          mode: 'translate',
          formality:
            // eslint-disable-next-line sonarjs/no-nested-conditional
            formal == null ? 'undefined' : formal ? 'formal' : 'informal',
          transcribe_as: 'romanize',
          advancedMode: false,
          textType: tagHandling,
          wasSpoken: false,
          ...(hasRegionalVariant && { regionalVariant: targetLang }),
        },
        lang: {
          source_lang_user_selected: 'auto',
          target_lang: targetLangCode,
          source_lang_computed: sourceLangCode,
        },
        jobs,
        timestamp: getTimeStamp(getICount(part)),
      },
    }

    let translations: Translation[]

    try {
      // Make translation request
      const { result } = await makeRequest(postData, proxyUrl, dlSession)
      translations = result.translations
    } catch (error) {
      return {
        code: HTTP_STATUS_SERVICE_UNAVAILABLE,
        message: String(error),
      }
    }

    // Process translation results
    let partTranslation = ''
    const partAlternatives: string[] = []

    if (translations.length > 0) {
      // Process main translation
      for (const translation of translations) {
        partTranslation += translation.beams[0].sentences[0].text + ' '
      }
      partTranslation = partTranslation.trim()

      // Process alternatives
      const numBeams = translations[0].beams.length
      for (let i = 1; i < numBeams; i++) {
        // Start from 1 since 0 is the main translation
        let altText = ''
        for (const translation of translations) {
          const beams = translation.beams
          if (i < beams.length) {
            altText += beams[i].sentences[0].text + ' '
          }
        }
        if (altText) {
          partAlternatives.push(altText.trim())
        }
      }
    }

    if (!partTranslation) {
      return {
        code: HTTP_STATUS_SERVICE_UNAVAILABLE,
        message: 'Translation failed',
      }
    }

    translatedParts.push(partTranslation)
    allAlternatives.push(partAlternatives)
  }

  // Join all translated parts with newlines
  const translatedText = translatedParts.join('\n')

  // Combine alternatives with proper newline handling
  const combinedAlternatives: string[] = []

  let maxAlts = 0
  for (const alts of allAlternatives) {
    if (alts.length > maxAlts) {
      maxAlts = alts.length
    }
  }

  // Create combined alternatives preserving line structure
  for (let i = 0; i < maxAlts; i++) {
    const altParts: string[] = []
    for (const [j, alts] of allAlternatives.entries()) {
      if (i < alts.length) {
        altParts.push(alts[i])
      } else if (translatedParts[j].length === 0) {
        altParts.push('') // Keep empty lines
      } else {
        altParts.push(translatedParts[j]) // Use main translation if no alternative
      }
    }
    combinedAlternatives.push(altParts.join('\n'))
  }

  return {
    code: HTTP_STATUS_OK,
    id: getRandomNumber(), // Using new ID for the complete translation
    data: translatedText,
    alternatives: combinedAlternatives,
    sourceLang: sourceLang!,
    targetLang,
    method: dlSession ? 'Pro' : 'Free',
  }
}
