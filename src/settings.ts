export const API_URL = 'https://www2.deepl.com/jsonrpc'

export const AUTO = 'auto'

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
] as const

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

export type Language = SupportedLanguage['code'] | SupportedLanguage['language']

export type TargetLanguage =
  | Language
  | Lowercase<Language>
  | Uppercase<Language>

export type SourceLanguage = TargetLanguage | 'auto'

export const SUPPORTED_FORMALITY_TONES = ['formal', 'informal']
