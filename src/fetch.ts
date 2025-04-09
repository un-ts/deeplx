import fetch, { Headers } from 'node-fetch'

// @ts-expect-error -- incompatible types
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
globalThis.fetch ??= fetch

// @ts-expect-error -- incompatible types
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
globalThis.Headers ??= Headers
