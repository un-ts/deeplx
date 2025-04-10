import type {
  FormalityTone,
  SourceLanguage,
  TargetLanguage,
} from './constants.ts'

export type ValueOf<T> =
  T extends ReadonlyArray<infer R> ? R : T extends Set<infer R> ? R : T[keyof T]

// Lang represents the language settings for translation
export interface Lang {
  source_lang_user_selected: string // Can be "auto"
  target_lang: string
  source_lang_computed?: string
}

// CommonJobParams represents common parameters for translation jobs
export interface CommonJobParams {
  formality: FormalityTone // Can be "undefined"
  transcribe_as: string
  mode: string
  wasSpoken: boolean
  advancedMode: boolean
  textType: string
  regionalVariant?: string
}

// Sentence represents a sentence in the translation request
export interface Sentence {
  prefix: string
  text: string
  id: number // int
}

// Job represents a translation job
export interface Job {
  kind: string
  preferred_num_beams: number
  raw_en_context_before: string[]
  raw_en_context_after: string[]
  sentences: Sentence[]
}

// Params represents parameters for translation requests
export interface Params {
  commonJobParams: CommonJobParams
  lang: Lang
  jobs: Job[]
  timestamp: number // int64
}

// PostData represents the complete translation request
export interface PostData {
  jsonrpc: string
  method: string
  id: number
  params: Params
}

export interface TranslationBeam {
  sentences: SentenceResponse[]
  num_symbols: number
  // Added rephrase_variant
  rephrase_variant: {
    name: string
  }
}

export interface Translation {
  beams: TranslationBeam[]
  quality: string // Added quality
}

// TranslationResponse represents the response from translation
export interface TranslationResponse {
  jsonrpc: string
  id: number
  result: {
    translations: Translation[]
    target_lang: string
    source_lang: string
    source_lang_is_confident: boolean
    detectedLanguages: Record<string, string>
  }
}

// SentenceResponse is a helper struct for the response sentences
export interface SentenceResponse {
  text: string
  ids: number[] // Added IDS
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
