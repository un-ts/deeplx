// Workaround for Vercel `Cannot find module 'deeplx'`
import type { SourceLanguage, TargetLanguage } from './_deeplx.js'
import { abbreviateLanguage, translate } from './_deeplx.js'

export interface RequestParams {
  text?: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

const OK = 200
const NOT_ALLOWED = 405
const INTERNAL_ERROR = 500

export const config = {
  runtime: 'edge',
}

export default async (req: Request): Promise<Response> => {
  let body: RequestParams | undefined

  try {
    body = (await req.json()) as RequestParams
  } catch {}

  if (!body || req.method !== 'POST') {
    return new Response(`DeepL Translate Api

POST {"text": "have a try", "source_lang": "auto", "target_lang": "ZH"} to /translate

https://github.com/un-ts/deeplx`)
  }

  const { text, source_lang, target_lang } = body

  if (!abbreviateLanguage(target_lang)) {
    return new Response(
      JSON.stringify({
        code: NOT_ALLOWED,
        data: 'Invalid target language',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: NOT_ALLOWED,
      },
    )
  }

  try {
    const translation = await translate(text, target_lang, source_lang)
    return new Response(
      JSON.stringify({
        code: OK,
        data: translation,
      }),
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        code: INTERNAL_ERROR,
        data: err,
      }),
      {
        status: INTERNAL_ERROR,
      },
    )
  }
}
