import fetch, { Headers } from 'node-fetch'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!globalThis.fetch) {
  // @ts-expect-error
  globalThis.fetch = fetch
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!globalThis.Headers) {
  // @ts-expect-error
  globalThis.Headers = Headers
}
