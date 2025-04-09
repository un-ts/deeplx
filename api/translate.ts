import {
  type SourceLanguage,
  type TargetLanguage,
  abbreviateLanguage,
  translate,
} from '../src/index.js'

export interface RequestParams {
  text?: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

export const config = {
  runtime: 'edge',
}

const OK = 200
const NOT_ALLOWED = 405
const INTERNAL_ERROR = 500

export default async function handler(req: Request): Promise<Response> {
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
    return Response.json(
      { code: NOT_ALLOWED, data: 'Invalid target language' },
      { status: NOT_ALLOWED },
    )
  }

  try {
    const translation = await translate(text, target_lang, source_lang)
    return Response.json({ code: OK, data: translation })
  } catch (err) {
    return Response.json(
      { code: INTERNAL_ERROR, data: err },
      { status: INTERNAL_ERROR },
    )
  }
}
