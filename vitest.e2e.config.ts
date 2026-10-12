import { defineConfig } from 'vitest/config'

// The e2e suite loads a real Chromium extension and talks to the live endpoint,
// so it stays out of `yarn test`: run it with `yarn test:e2e`, after `yarn build`.
export default defineConfig({
  test: {
    coverage: { enabled: false },
    include: ['e2e/**/*.spec.ts'],
    testTimeout: 2 * 60 * 1000,
  },
})
