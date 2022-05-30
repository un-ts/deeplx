import { VercelRequest, VercelResponse } from '@vercel/node'
import type { SourceLanguage, TargetLanguage } from 'deepl-translate'

// Workaround for Vercel `Cannot find module 'deepl-translate'`
import { translate } from './_deepl'

export interface RequestParams {
  text: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

const NO_CONTENT = 204
const NOT_ALLOWED = 405

export default async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(NOT_ALLOWED)
    res.end()
    return
  }

  const {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    // type-coverage:ignore-next-line
  } = req.body as RequestParams

  if (!text) {
    res.status(NO_CONTENT)
    res.end()
    return
  }

  try {
    const translated = await translate(text, targetLang, sourceLang)
    res.end(translated)
  } catch (err) {
    res.status(500)
    res.end(String(err))
  }
}
