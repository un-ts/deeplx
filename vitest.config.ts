import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      deeplx: new URL('src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    coverage: {
      enabled: true,
      include: ['src'],
      exclude: ['src/cli.ts', 'src/fetch.ts'],
      provider: 'istanbul',
      reporter: ['lcov', 'json', 'text'],
    },
  },
})
