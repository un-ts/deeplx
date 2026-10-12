// The browser test's entry: importing the package by name is what a consumer
// does, so this resolves through `exports` and the `browser` field rather than
// through this repository's sources.
export * from '@deeplx/core'
