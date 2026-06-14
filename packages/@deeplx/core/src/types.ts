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

export interface DeepLXTranslationSuccessResult {
  code: number
  id: number
  data: string // The primary translated text
  alternatives: string[] // Other possible translations
  sourceLang: SourceLanguage
  targetLang: TargetLanguage
  method: 'Free' | 'Pro'
}

// DeepLXTranslationResult represents the final translation result
export type DeepLXTranslationResult =
  | DeepLXTranslationErrorResult
  | DeepLXTranslationSuccessResult
