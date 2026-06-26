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

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

function json(data: unknown, status = HTTP_STATUS_OK): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function landingPage(): Response {
  const body = `DeepL Translate Api

POST {"text": "have a try", "source_lang": "auto", "target_lang": "ZH"} to /translate

https://github.com/un-ts/deeplx`
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (url.pathname === '/translate') {
      if (req.method !== 'POST') {
        return landingPage()
      }

      const body = (await req.json().catch(() => null)) as
        | RequestParams
        | undefined

      if (!body) {
        return json(
          { code: HTTP_STATUS_BAD_REQUEST, data: 'Invalid JSON' },
          HTTP_STATUS_BAD_REQUEST,
        )
      }

      const {
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        dl_session: dlSession,
        proxy_url: proxyUrl,
      } = body

      if (!text) {
        return json(
          { code: HTTP_STATUS_BAD_REQUEST, data: 'Text is required' },
          HTTP_STATUS_BAD_REQUEST,
        )
      }

      if (!abbreviateLanguage(targetLang)) {
        return json(
          { code: HTTP_STATUS_BAD_REQUEST, data: 'Invalid target language' },
          HTTP_STATUS_BAD_REQUEST,
        )
      }

      const result = await translateByDeepLX(
        sourceLang,
        targetLang,
        text,
        proxyUrl,
        dlSession,
      )

      return json(result, result.code)
    }

    return env.ASSETS.fetch(req)
  },
}
