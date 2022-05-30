import { SUPPORTED_LANGUAGES, type TargetLanguage } from './settings.js'

export function createAbbreviationsDictionary(languages = SUPPORTED_LANGUAGES) {
  return languages.reduce<Record<string, string>>((acc, lang) => {
    acc[lang.code.toLowerCase()] = lang.code
    acc[lang.language.toLowerCase()] = lang.code
    return acc
  }, {})
}

export function abbreviateLanguage(language: string) {
  return createAbbreviationsDictionary()[language.toLowerCase()] as
    | TargetLanguage
    | undefined
}

export function importEsm<T>(modulePath: string) {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  return new Function('modulePath', 'return import(modulePath)')(
    modulePath,
  ) as Promise<T>
}
