import { VercelRequest, VercelResponse } from '@vercel/node'
import type { SourceLanguage, TargetLanguage } from 'deeplx'

// Workaround for Vercel `Cannot find module 'deeplx'`
import { abbreviateLanguage, translate } from './_deepl'

export interface RequestParams {
  text?: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

const OK = 200
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

  text = text?.trim()

  if (req.method !== 'POST' || !text || !abbreviateLanguage(targetLang)) {
    res.end(`DeepL Translate Api

POST {"text": "have a try", "source_lang": "auto", "target_lang": "ZH"} to /translate

https://github.com/rx-ts/deeplx`)
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
