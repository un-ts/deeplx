import { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^deepl-translate$': '<rootDir>/src/index.ts',
  },
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        importHelpers: false,
      },
    },
  },
}

export default config
