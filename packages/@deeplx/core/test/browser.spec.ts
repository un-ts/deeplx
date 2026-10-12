import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { expect, test } from 'vitest'

// A browser (or a browser extension) can only use this library if it bundles for
// one. `platform: browser` makes esbuild fail on any `node:` built-in, and the
// `browser` field has to map `random.ts` to its Web Crypto twin for that to
// hold, so this guards the whole browser story in one test.
test('the library bundles for the browser', async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/index.ts', import.meta.url))],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
  })

  const output = result.outputFiles[0].text
  expect(output).not.toContain('node:crypto')
  expect(output).toContain('randomUUID')
})
