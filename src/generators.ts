import { generateId, generateTimestamp } from './hacks.js'
import {
  type FormalityTone,
  type SourceLanguage,
  type TargetLanguage,
  AUTO,
  SUPPORTED_FORMALITY_TONES,
} from './settings.js'

export function generateSplitSentencesRequestData(
  text: string,
  sourceLanguage: SourceLanguage = AUTO,
  identifier = generateId(),
) {
  return {
    jsonrpc: '2.0',
    method: 'LMT_split_into_sentences',
    params: {
      lang: {
        lang_user_selected: sourceLanguage,
        user_preferred_langs: [],
      },
      texts: [text],
    },
    id: identifier,
  }
}

export interface Job {
  kind: 'default'
  raw_en_sentence: string
  raw_en_context_before: string[]
  raw_en_context_after: string[]
  preferred_num_beams: number
}

export function generateJobs(sentences: string[], beams = 1) {
  return sentences.map<Job>((sentence, idx) => ({
    kind: 'default',
    raw_en_sentence: sentence,
    raw_en_context_before: sentences.slice(0, idx),
    raw_en_context_after:
      idx + 1 < sentences.length ? [sentences[idx + 1]] : [],
    preferred_num_beams: beams,
  }))
}

function generateCommonJobParams(formality?: FormalityTone) {
  if (!formality) {
    return {}
  }

  if (!SUPPORTED_FORMALITY_TONES.includes(formality)) {
    throw new Error(`Formality tone \`${formality}\` not supported.`)
  }

  return { formality }
}

export function generateTranslationRequestData(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
  sentences: string[],
  identifier = generateId(),
  alternatives = 1,
  formality?: FormalityTone,
) {
  return {
    jsonrpc: '2.0',
    method: 'LMT_handle_jobs',
    params: {
      jobs: generateJobs(sentences, alternatives),
      lang: {
        user_preferred_langs: [targetLanguage, sourceLanguage],
        source_lang_computed: sourceLanguage,
        target_lang: targetLanguage,
      },
      priority: 1,
      commonJobParams: generateCommonJobParams(formality),
      timestamp: generateTimestamp(sentences),
    },
    id: identifier,
  }
}
