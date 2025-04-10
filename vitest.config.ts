import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths({})],
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
