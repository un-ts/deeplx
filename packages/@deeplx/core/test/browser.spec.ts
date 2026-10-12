import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { build } from 'vite'
import { expect, test } from 'vitest'

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
