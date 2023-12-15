import autoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    autoImport({
      imports: 'vitest',
    }),
  ],
  resolve: {
    alias: {
      deeplx: new URL('src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    coverage: {
      include: ['src'],
      provider: 'istanbul',
      reporter: ['lcov', 'json', 'text'],
    },
  },
})
