import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { expect, test } from 'vitest'

// A browser (or a browser extension) can only use this library if its published
// resolution gets there: bundlers enter through `exports`, and `browser` in
// package.json has to swap the built `random.js` for its Web Crypto twin on the
// way. This needs `yarn build` first, which is what CI does before testing, and
// `tsconfigRaw` clears this repository's `paths` so the entry resolves the way a
// consumer's does instead of pointing back at the sources.
const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))

test.skipIf(!existsSync(entry))(
  'the published package bundles for the browser, with no node:crypto',
  async () => {
    const result = await build({
      stdin: {
        contents: "export * from '@deeplx/core'",
        resolveDir: process.cwd(),
      },
      tsconfigRaw: {},
      bundle: true,
      format: 'esm',
      platform: 'browser',
      write: false,
    })

    const output = result.outputFiles[0].text
    expect(output).not.toContain('node:crypto')
    expect(output).toContain('globalThis.crypto')
  },
)
