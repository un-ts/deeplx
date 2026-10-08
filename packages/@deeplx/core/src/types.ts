import type { SourceLanguage, TargetLanguage } from './constants.ts'

export type ValueOf<T> =
  T extends ReadonlyArray<infer R> ? R : T extends Set<infer R> ? R : T[keyof T]

export interface AppInformation {
  os: string
  os_version: string
  app_version: string
  app_build: string
  instance_id: string
}

export interface OneshotRequest {
  text: string[]
  target_lang: string
  source_lang?: string
  usage_type: string
  app_information: AppInformation
}

export interface OneshotTranslation {
  text: string
  detected_source_language?: string
  // DeepL reports whether it is confident about `detected_source_language`.
  // When it is not, `detected_source_language` only repeats the requested
  // `source_lang` (or the endpoint's default) rather than a real detection.
  is_language_detection_confident?: boolean
}

export interface OneshotResponse {
  translations: OneshotTranslation[]
}

export interface DeepLXTranslationErrorResult {
  code: number
  message: string
}

export interface DeepLXTranslationSuccessResult {
  code: number
  id: number
  data: string // The primary translated text
  alternatives: string[] // Other possible translations
  sourceLang: SourceLanguage
  targetLang: TargetLanguage
  method: 'Free' | 'Pro'
  /**
   * Whether DeepL is confident about the detected source language, passed
   * through from the oneshot response's `is_language_detection_confident`.
   *
   * Optional, and only set when the endpoint reports it. When it is `false`,
   * `sourceLang` may just repeat the requested `source_lang` (or the endpoint's
   * default) instead of a real detection: an English sentence sent with
   * `source_lang: 'zh'` comes back as `sourceLang: 'ZH'` with this flag `false`,
   * while the same sentence with no `source_lang` reports `sourceLang: 'EN'`.
   * Without the flag a caller cannot tell an echoed source language from a
   * detected one.
   */
  languageDetectionConfident?: boolean
}

// DeepLXTranslationResult represents the final translation result
export type DeepLXTranslationResult =
  | DeepLXTranslationErrorResult
  | DeepLXTranslationSuccessResult
