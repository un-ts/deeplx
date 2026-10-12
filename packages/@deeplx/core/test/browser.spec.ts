import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { expect, test } from 'vitest'

// A browser (or a browser extension) can only use this library if it bundles for
// one: `platform: browser` makes esbuild fail on any `node:` built-in, so this
// guards against a Node-only import creeping back in.
test('the library bundles for the browser', async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/index.ts', import.meta.url))],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
  })

  expect(result.outputFiles).toHaveLength(1)
  expect(result.outputFiles[0].text).toContain('randomUUID')
})
