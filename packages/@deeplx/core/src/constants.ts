import type { ValueOf } from './types.ts'

export const SUPPORTED_LANGUAGES = [
  { code: 'AR', language: 'Arabic' },
  { code: 'BG', language: 'Bulgarian' },
  { code: 'CS', language: 'Czech' },
  { code: 'DA', language: 'Danish' },
  { code: 'DE', language: 'German' },
  { code: 'EL', language: 'Greek' },
  { code: 'EN', language: 'English' },
  { code: 'EN-GB', language: 'English (British)' },
  { code: 'EN-US', language: 'English (American)' },
  { code: 'ES', language: 'Spanish' },
  { code: 'ES-419', language: 'Spanish (Latin American)' },
  { code: 'ET', language: 'Estonian' },
  { code: 'FI', language: 'Finnish' },
  { code: 'FR', language: 'French' },
  { code: 'HE', language: 'Hebrew' },
  { code: 'HU', language: 'Hungarian' },
  { code: 'ID', language: 'Indonesian' },
  { code: 'IT', language: 'Italian' },
  { code: 'JA', language: 'Japanese' },
  { code: 'KO', language: 'Korean' },
  { code: 'LT', language: 'Lithuanian' },
  { code: 'LV', language: 'Latvian' },
  { code: 'NB', language: 'Norwegian Bokmål' },
  { code: 'NL', language: 'Dutch' },
  { code: 'PL', language: 'Polish' },
  { code: 'PT', language: 'Portuguese' },
  { code: 'PT-BR', language: 'Portuguese (Brazilian)' },
  { code: 'PT-PT', language: 'Portuguese (European)' },
  { code: 'RO', language: 'Romanian' },
  { code: 'RU', language: 'Russian' },
  { code: 'SK', language: 'Slovak' },
  { code: 'SL', language: 'Slovenian' },
  { code: 'SV', language: 'Swedish' },
  { code: 'TR', language: 'Turkish' },
  { code: 'UK', language: 'Ukrainian' },
  { code: 'VI', language: 'Vietnamese' },
  { code: 'ZH', language: 'Chinese' },
  { code: 'ZH-HANS', language: 'Chinese (Simplified)' },
  { code: 'ZH-HANT', language: 'Chinese (Traditional)' },
] as const

export type SupportedLanguage = ValueOf<typeof SUPPORTED_LANGUAGES>

export type SupportedCode = SupportedLanguage['code']

export type Language =
  | SupportedCode
  | SupportedLanguage['language']
  // language code with variant
  | `${SupportedCode}-${string}`

export type TargetLanguage =
  | Language
  | Lowercase<Language>
  | Uppercase<Language>

export type SourceLanguage = TargetLanguage | 'auto'

export const ONESHOT_FREE_ENDPOINT =
  'https://oneshot-free.www.deepl.com/v1/translate'
export const ONESHOT_PRO_ENDPOINT =
  'https://oneshot-pro.www.deepl.com/v1/translate'

/**
 * Request profile pinned to the official DeepL iOS app (26.42, build 5443737),
 * mirroring OwO-Network/DLX. DeepL rate-limits clients whose TLS fingerprint,
 * User-Agent and `app_information` tell inconsistent stories, so every value
 * below must stay on one coherent iOS profile.
 *
 * `IOS_OS_VERSION` is what the app reports through `UIDevice.systemVersion` and
 * `x-app-os-version`. It must be a shipping iOS major: the IPA is built against
 * iphoneos26.5, and a future value combined with an iOS TLS fingerprint is
 * rejected with HTTP 429 (and can temporarily ban the IP).
 */
export const IOS_APP_VERSION = '26.42'
export const IOS_APP_BUILD = '5443737'
export const IOS_OS_VERSION = '26.0'
export const IOS_CFNETWORK_VERSION = '3826.600.41'
export const IOS_DARWIN_VERSION = '25.0.0'

/**
 * @deprecated The oneshot client now impersonates the DeepL iOS app (see
 * {@link IOS_APP_VERSION}); the Chrome-extension constants are no longer sent
 * on the wire. They are kept so the exported surface does not break and can be
 * removed in a future major release.
 */
export const IMPERSONATED_CHROME_MAJOR = '120'
/** @deprecated see {@link IMPERSONATED_CHROME_MAJOR} */
export const CHROME_EXTENSION_VERSION = '1.86.0'
/** @deprecated see {@link IMPERSONATED_CHROME_MAJOR} */
export const CHROME_EXTENSION_ID = 'cofdbpoegempjloogbagkncekinflcnj'
export const MAX_FREE_TEXT_LENGTH = 1500

export const HTTP_STATUS_OK = 200
export const HTTP_STATUS_BAD_REQUEST = 400
export const HTTP_STATUS_FORBIDDEN = 403
export const HTTP_STATUS_NOT_FOUND = 404
export const HTTP_STATUS_NOT_ALLOWED = 405
export const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429
export const HTTP_STATUS_INTERNAL_ERROR = 500
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503

/**
 * Language code tables mirror the bundled list in the extension's background.js
 * (arrays `y` ~offset 6000 for the full target-capable set, `A` for source-only
 * aliases). Keys are the uppercase forms callers pass; values are the lowercase
 * BCP-47-ish forms the oneshot endpoint expects ("de", "en-US", "zh-Hans",
 * ...).
 *
 * TARGET_LANG_MAP is what the API accepts as `target_lang`. EN and PT are
 * intentionally absent from DeepL's official target codes in favour of
 * EN-US/EN-GB and PT-BR/PT-PT. We include EN/PT in this map as a
 * backward-compat convenience and resolve them to the regional default.
 */
export const TARGET_LANG_MAP: Record<string, string> = {
  AR: 'ar',
  BG: 'bg',
  CS: 'cs',
  DA: 'da',
  DE: 'de',
  EL: 'el',
  'EN-GB': 'en-GB',
  'EN-US': 'en-US',
  ES: 'es',
  'ES-419': 'es-419',
  ET: 'et',
  FI: 'fi',
  FR: 'fr',
  HE: 'he',
  HU: 'hu',
  ID: 'id',
  IT: 'it',
  JA: 'ja',
  KO: 'ko',
  LT: 'lt',
  LV: 'lv',
  NB: 'nb',
  NL: 'nl',
  PL: 'pl',
  'PT-BR': 'pt-BR',
  'PT-PT': 'pt-PT',
  RO: 'ro',
  RU: 'ru',
  SK: 'sk',
  SL: 'sl',
  SV: 'sv',
  TR: 'tr',
  UK: 'uk',
  VI: 'vi',
  ZH: 'zh-Hans',
  'ZH-HANS': 'zh-Hans',
  'ZH-HANT': 'zh-Hant',
  EN: 'en-US',
  PT: 'pt-BR',
}

/**
 * SOURCE_LANG_MAP is what the API accepts as `source_lang`. It is a superset of
 * TARGET_LANG_MAP: EN and PT are first-class source codes mapping to the
 * generic "en"/"pt" — used when the caller knows the input is
 * English/Portuguese but does not want to commit to a regional variant.
 */
export const SOURCE_LANG_MAP: Record<string, string> = {
  ...TARGET_LANG_MAP,
  EN: 'en',
  PT: 'pt',
}
