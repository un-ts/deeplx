import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

import { build } from 'vite'
import { expect, test } from 'vitest'

import type { DeepLXTranslationResult } from '../src/types.ts'

// A browser extension's background service worker: no `window`, no `document`,
// no Node globals — just `fetch` and Web Crypto, and the CORS exemption its host
// permissions grant. The published bundle is loaded into such a realm and has to
// translate, which is as close to the real thing as a Node test can get. Needs
// `yarn build` first, as CI does.
const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))

interface ExtensionRealm {
  deeplx?: {
    translateByDeepLX: (
      sourceLang: string,
      targetLang: string,
      text: string,
      proxyUrl?: string,
      dlSession?: string,
      signal?: AbortSignal,
      skipWarm?: boolean,
    ) => Promise<DeepLXTranslationResult>
  }
}

test.skipIf(!existsSync(entry))(
  'the published bundle translates inside an extension service worker realm',
  async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(new URL('browser-entry.ts', import.meta.url)),
          formats: ['iife'],
          name: 'deeplx',
          fileName: 'extension',
        },
      },
    })

    const [batched] = Array.isArray(result) ? result : [result]
    if (!('output' in batched)) {
      throw new Error('expected the build to report its output')
    }
    const code = batched.output
      .map(chunk => ('code' in chunk ? chunk.code : ''))
      .join('')

    const requests: Array<{ body: string; init: RequestInit; url: string }> = []
    const realm: Record<string, unknown> = {
      AbortController,
      Headers,
      Request,
      Response,
      TextDecoder,
      TextEncoder,
      URL,
      URLSearchParams,
      clearTimeout,
      console,
      crypto: globalThis.crypto,
      fetch: (input: URL | string, init?: RequestInit) => {
        requests.push({
          body: typeof init?.body === 'string' ? init.body : '',
          init: init ?? {},
          url: String(input),
        })
        return Promise.resolve(
          new Response(JSON.stringify({ translations: [{ text: 'Hello' }] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      },
      setTimeout,
    }

    // eslint-disable-next-line sonarjs/code-eval -- running the built bundle is the point
    runInNewContext(code, realm)

    const { deeplx } = realm as unknown as ExtensionRealm
    if (!deeplx) {
      throw new Error('the bundle did not expose its entry point')
    }

    const translated = await deeplx.translateByDeepLX(
      'DE',
      'EN',
      'Hallo',
      undefined,
      undefined,
      undefined,
      true,
    )

    // The realm has no `window`, `document` or `process`, so reaching here at all
    // says the bundle needs none of them.
    expect(translated).toMatchObject({ code: 200, data: 'Hello' })

    const [request] = requests
    expect(request.url).toContain('/v1/translate')
    expect(request.init.method).toBe('POST')
    expect(JSON.parse(request.body)).toMatchObject({
      source_lang: 'de',
      target_lang: 'en-US',
      text: ['Hallo'],
    })

    const headers = new Headers(request.init.headers)
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    expect(headers.get('x-app-instance-id')).toMatch(uuid)
    expect(headers.get('x-app-session-id')).toMatch(uuid)
  },
)
