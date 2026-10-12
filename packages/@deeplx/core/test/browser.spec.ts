import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { build } from 'vite'
import { expect, test } from 'vitest'

import { randomUUID } from '../src/random.browser.ts'

// A browser (or a browser extension) can only use this library if its published
// resolution gets there: bundlers enter through `exports`, and `browser` in
// package.json has to swap the built `random.js` for its Web Crypto twin on the
// way. `vite` is already a dependency here, and it resolves like a consumer
// would — this repository's `paths` are an esbuild-only convenience, so they play
// no part. Needs `yarn build` first, which is what CI does before testing.
const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))

test.skipIf(!existsSync(entry))(
  'the published package bundles for the browser, with no node:crypto',
  async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(new URL('browser-entry.ts', import.meta.url)),
          formats: ['es'],
          fileName: 'browser',
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

    expect(code).not.toContain('node:crypto')
    expect(code).toContain('globalThis.crypto')
  },
)

// The twin needs exercising on its own as well: the bundle in the extension test
// runs it, but coverage maps the sources, and this is the module browsers get.
test('the browser twin generates a v4 UUID', () => {
  const first = randomUUID()
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  expect(first).toMatch(uuid)
  expect(randomUUID()).not.toBe(first)
})
