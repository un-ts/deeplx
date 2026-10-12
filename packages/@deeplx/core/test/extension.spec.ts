import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

import { build } from 'vite'
import { expect, test } from 'vitest'

// A browser extension's background service worker, as far as Node can stand in
// for one: no `window`, no `document`, no Node globals, and the forbidden request
// headers a browser refuses to send stripped before they leave. Loading a real
// extension needs a browser, so this covers the two things that matter there —
// the realm's globals and the header profile. Needs `yarn build` first, as CI
// does.
const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))

// `User-Agent`, `Accept-Encoding` and `Cookie` are forbidden request header
// names: a browser drops them whatever `fetch` was given. An extension can put
// the first two back with a `declarativeNetRequest` rule, and only the cookie jar
// can send the third — no library API can.
const forbidden = new Set([
  'accept-encoding',
  'cookie',
  'host',
  'origin',
  'user-agent',
])

interface ExtensionRealm {
  deeplx?: {
    translate: (
      text: string,
      targetLang: string,
      sourceLang?: string,
      options?: { skipWarm?: boolean },
    ) => Promise<string>
  }
}

test.skipIf(!existsSync(entry))(
  'the published bundle translates where a browser strips its profile headers',
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

    const requests: Array<{
      body: string
      headers: Headers
      init: RequestInit
      url: string
    }> = []
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
        const headers = new Headers(init?.headers)
        for (const name of forbidden) {
          headers.delete(name)
        }
        requests.push({
          body: typeof init?.body === 'string' ? init.body : '',
          headers,
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

    const translated = await deeplx.translate('Hallo', 'EN', 'DE', {
      skipWarm: true,
    })

    // The realm has no `window`, `document` or `process`, so reaching here at all
    // says the bundle needs none of them.
    expect(translated).toBe('Hello')

    const [request] = requests
    expect(request.url).toContain('/v1/translate')
    expect(request.init.method).toBe('POST')
    expect(JSON.parse(request.body)).toMatchObject({
      source_lang: 'de',
      target_lang: 'en-US',
      text: ['Hallo'],
    })

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    expect(request.headers.get('x-app-instance-id')).toMatch(uuid)
    expect(request.headers.get('x-app-session-id')).toMatch(uuid)

    // What the browser took away — and what only a `declarativeNetRequest` rule
    // can add back — does not stop the call from working.
    expect(request.headers.get('user-agent')).toBeNull()
    expect(request.headers.get('accept-encoding')).toBeNull()
  },
)
