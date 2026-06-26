import {
  SUPPORTED_LANGUAGES,
  type Language,
  type SupportedCode,
} from './constants.ts'

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
