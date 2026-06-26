import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      deeplx: import.meta.resolve('./packages/deeplx/src/index.ts'),
      '@deeplx/core': import.meta
        .resolve('./packages/@deeplx/core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    coverage: {
      enabled: true,
      include: ['packages/**/src'],
      exclude: ['packages/**/src/cli.ts', 'packages/**/src/fetch.ts'],
      provider: 'istanbul',
      reporter: ['lcov', 'json', 'text'],
    },
  },
})
