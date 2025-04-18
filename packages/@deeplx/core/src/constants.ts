import type { HeadersInit } from 'undici'

import type { ValueOf } from './types.ts'

export const SUPPORTED_LANGUAGES = [
  { code: 'BG', language: 'Bulgarian' },
  { code: 'ZH', language: 'Chinese' },
  { code: 'CS', language: 'Czech' },
  { code: 'DA', language: 'Danish' },
  { code: 'NL', language: 'Dutch' },
  { code: 'EN', language: 'English' },
  { code: 'ET', language: 'Estonian' },
  { code: 'FI', language: 'Finnish' },
  { code: 'FR', language: 'French' },
  { code: 'DE', language: 'German' },
  { code: 'EL', language: 'Greek' },
  { code: 'HU', language: 'Hungarian' },
  { code: 'IT', language: 'Italian' },
  { code: 'JA', language: 'Japanese' },
  { code: 'LV', language: 'Latvian' },
  { code: 'LT', language: 'Lithuanian' },
  { code: 'PL', language: 'Polish' },
  { code: 'PT', language: 'Portuguese' },
  { code: 'RO', language: 'Romanian' },
  { code: 'RU', language: 'Russian' },
  { code: 'SK', language: 'Slovak' },
  { code: 'SL', language: 'Slovenian' },
  { code: 'ES', language: 'Spanish' },
  { code: 'SV', language: 'Swedish' },
  { code: 'TR', language: 'Turkish' },
  { code: 'ID', language: 'Indonesian' },
  { code: 'UK', language: 'Ukrainian' },
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

export const FORMALITY_TONES = new Set([
  'formal',
  'informal',
  'undefined',
] as const)

export type FormalityTone = ValueOf<typeof FORMALITY_TONES>

export const API_URL = 'https://www2.deepl.com/jsonrpc'

export const HTTP_STATUS_OK = 200
export const HTTP_STATUS_BAD_REQUEST = 400
export const HTTP_STATUS_NOT_FOUND = 404
export const HTTP_STATUS_NOT_ALLOWED = 405
export const HTTP_STATUS_INTERNAL_ERROR = 500
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503

export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'DeepL/1627620 CFNetwork/3826.500.62.2.1 Darwin/24.4.0',
  Accept: '*/*',
  'X-App-Os-Name': 'iOS',
  'X-App-Os-Version': '18.4.0',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br', // Keep this!
  'X-App-Device': 'iPhone16,2',
  Referer: 'https://www.deepl.com/',
  'X-Product': 'translator',
  'X-App-Build': '1627620',
  'X-App-Version': '25.1',
} as const satisfies HeadersInit
