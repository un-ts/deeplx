// Node keeps `node:crypto`: the package's declared engines include Node versions
// whose only UUID source is that module, and a browser bundle never reaches this
// file — `browser` in package.json maps it to `random.browser.ts`.
export { randomUUID } from 'node:crypto'
