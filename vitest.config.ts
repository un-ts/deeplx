import path from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'deepl-translate': path.resolve('src'),
    },
  },
  test: {
    coverage: {
      exclude: ['test'],
      reporter: ['json'],
    },
    testTimeout: (process.env.CI === 'true' ? 20 : 5) * 1000,
  },
})
