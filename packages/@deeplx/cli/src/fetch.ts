import fetch, { Headers } from 'node-fetch-native'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
globalThis.fetch ??= fetch

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
globalThis.Headers ??= Headers
