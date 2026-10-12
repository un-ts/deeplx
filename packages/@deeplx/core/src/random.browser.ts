/**
 * The browser build of `random.ts`: browsers have the Web Crypto API and no
 * `node:crypto`, and `browser` in package.json is what swaps this file in. It
 * needs a secure context (https or an extension), like any Web Crypto call.
 */
export const randomUUID = (): string => globalThis.crypto.randomUUID()
