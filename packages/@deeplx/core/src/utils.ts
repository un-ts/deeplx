import {
  SUPPORTED_LANGUAGES,
  type Language,
  type SupportedCode,
} from './constants.ts'
import type { PostData } from './types.ts'

// getICount returns the number of 'i' characters in the text
export const getICount = (translateText: string): number => {
  return (translateText.match(/i/g) || []).length
}

// getRandomNumber generates a random number for request ID
export const getRandomNumber = (): number => {
  // eslint-disable-next-line sonarjs/pseudo-random, @typescript-eslint/no-magic-numbers
  const base = Math.floor(Math.random() * 99_999) + 8_300_000
  return base * 1000
}

// getTimeStamp generates timestamp for request based on i count
export const getTimeStamp = (iCount: number): number => {
  const ts = Date.now()
  if (iCount !== 0) {
    const adjustedCount = iCount + 1
    return ts - (ts % adjustedCount) + adjustedCount
  }
  return ts
}

// formatPostString formats the request JSON string with specific spacing rules
export const formatPostString = (postData: PostData): string => {
  const postStr = JSON.stringify(postData)
  const shouldAddSpace =
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    (postData.id + 5) % 29 === 0 || (postData.id + 3) % 13 === 0
  return postStr.replaceAll(
    '"method":"',
    shouldAddSpace ? `"method" : "` : `"method": "`,
  )
}

let abbreviateLanguageDictionary:
  | Record<Lowercase<Language>, SupportedCode>
  | undefined

function getAbbreviateLanguages() {
  // eslint-disable-next-line sonarjs/no-nested-assignment
  return (abbreviateLanguageDictionary ??= SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.code.toLowerCase() as Lowercase<Language>] = lang.code
      acc[lang.language.toLowerCase() as Lowercase<Language>] = lang.code
      return acc
    },
    {} as Record<Lowercase<Language>, SupportedCode>,
  ))
}

export function abbreviateLanguage(
  language: string,
): SupportedCode | undefined {
  return getAbbreviateLanguages()[
    language.split('-')[0].toLowerCase() as Lowercase<Language>
  ]
}
