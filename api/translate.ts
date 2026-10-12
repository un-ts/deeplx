import {
  type SourceLanguage,
  type TargetLanguage,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_OK,
  abbreviateLanguage,
  translateByDeepLX,
} from '@deeplx/core'

interface RequestParams {
  text: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
  dl_session?: string
  proxy_url?: string
}

const LANDING_PAGE = `DeepL Translate Api

POST {"text": "have a try", "source_lang": "auto", "target_lang": "ZH"} to /translate

https://github.com/un-ts/deeplx`

interface VercelRequest {
  method?: string
  body?: RequestParams
}

interface VercelResponse {
  setHeader(name: string, value: string): void
  status(code: number): {
    end(): void
    json(body: unknown): void
    send(body: string): void
  }
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.status(HTTP_STATUS_OK).end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(HTTP_STATUS_OK).send(LANDING_PAGE)
    return
  }

  const body = req.body

  if (!body) {
    setCors(res)
    res
      .status(HTTP_STATUS_BAD_REQUEST)
      .json({ code: HTTP_STATUS_BAD_REQUEST, data: 'Invalid JSON' })
    return
  }

  const {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    dl_session: dlSession,
    proxy_url: proxyUrl,
  } = body

  if (!text) {
    setCors(res)
    res
      .status(HTTP_STATUS_BAD_REQUEST)
      .json({ code: HTTP_STATUS_BAD_REQUEST, data: 'Text is required' })
    return
  }

  if (!abbreviateLanguage(targetLang)) {
    setCors(res)
    res
      .status(HTTP_STATUS_BAD_REQUEST)
      .json({ code: HTTP_STATUS_BAD_REQUEST, data: 'Invalid target language' })
    return
  }

  const result = await translateByDeepLX(
    sourceLang,
    targetLang,
    text,
    proxyUrl,
    dlSession,
  )

  setCors(res)
  res.status(result.code).json(result)
}
