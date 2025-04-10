import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  type SourceLanguage,
  type TargetLanguage,
  HTTP_STATUS_OK,
  HTTP_STATUS_INTERNAL_ERROR,
  abbreviateLanguage,
  translate,
  HTTP_STATUS_BAD_REQUEST,
} from '@deeplx/core'

export interface RequestParams {
  text: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // type-coverage:ignore-next-line
  const body = req.body as RequestParams | undefined

  if (!body || req.method !== 'POST') {
    res.end(`DeepL Translate Api

POST {"text": "have a try", "source_lang": "auto", "target_lang": "ZH"} to /translate

https://github.com/un-ts/deeplx`)
    return
  }

  res.setHeader('Content-Type', 'application/json')

  const { text, source_lang: sourceLang, target_lang: targetLang } = body

  if (!text) {
    res.status(HTTP_STATUS_BAD_REQUEST).json({
      code: HTTP_STATUS_BAD_REQUEST,
      data: 'Text is required',
    })
    return
  }

  if (!abbreviateLanguage(targetLang)) {
    res.status(HTTP_STATUS_BAD_REQUEST).json({
      code: HTTP_STATUS_BAD_REQUEST,
      data: 'Invalid target language',
    })
    return
  }

  try {
    const translation = await translate(text, targetLang, sourceLang)
    res.json({
      code: HTTP_STATUS_OK,
      data: translation,
    })
  } catch (err) {
    res.status(HTTP_STATUS_INTERNAL_ERROR).json({
      code: HTTP_STATUS_INTERNAL_ERROR,
      data: err instanceof Error ? err.message : String(err),
    })
  }
}
