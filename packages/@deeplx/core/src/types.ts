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
}

export interface OneshotResponse {
  translations: OneshotTranslation[]
}

export interface DeepLXTranslationErrorResult {
  code: number
  message: string
}

/**
 * @typeParam T - `string` for a single text, `string[]` for a batch. A batch's
 * `data` is position-aligned with the requested `text` array.
 */
export interface DeepLXTranslationSuccessResult<
  T extends string[] | string = string,
> {
  code: number
  id: number
  data: T // The translated text(s), aligned with the requested text(s)
  alternatives: string[] // Other possible translations
  sourceLang: SourceLanguage
  targetLang: TargetLanguage
  method: 'Free' | 'Pro'
}

// DeepLXTranslationResult represents the final translation result
export type DeepLXTranslationResult<T extends string[] | string = string> =
  DeepLXTranslationErrorResult | DeepLXTranslationSuccessResult<T>

/**
 * The result of a batch request, i.e. one whose `text` argument was an array:
 * `data` holds one translation per requested text, in the same order.
 */
export type DeepLXBatchTranslationResult = DeepLXTranslationResult<string[]>
