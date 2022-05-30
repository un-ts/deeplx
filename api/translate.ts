import { VercelRequest, VercelResponse } from '@vercel/node'
import type { SourceLanguage, TargetLanguage } from 'deepl-translate'

// Workaround for Vercel `Cannot find module 'deepl-translate'`
import { abbreviateLanguage, translate } from './_deepl'

export interface RequestParams {
  text?: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

const OK = 200
const NO_CONTENT = 204
const NOT_ALLOWED = 405
const INTERNAL_ERROR = 500

export default async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> => {
  let {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    // type-coverage:ignore-next-line
  } = req.body as RequestParams

  if (req.method !== 'POST' || !abbreviateLanguage(targetLang)) {
    res.status(NOT_ALLOWED)
    res.end(
      JSON.stringify({
        code: NOT_ALLOWED,
      }),
    )
    return
  }

  if (text == null) {
    res.status(NO_CONTENT)
    return
  }

  text = text.trim()

  if (!text) {
    res.end(
      JSON.stringify({
        code: OK,
        data: '',
      }),
    )
    return
  }

  try {
    const translated = await translate(text, targetLang, sourceLang)
    res.end(
      JSON.stringify({
        code: OK,
        data: translated,
      }),
    )
  } catch (err) {
    res.status(INTERNAL_ERROR)
    res.end(
      JSON.stringify({
        code: INTERNAL_ERROR,
        data: String(err),
      }),
    )
  }
}
