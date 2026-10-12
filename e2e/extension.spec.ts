import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'
import { build } from 'vite'
import { expect, test } from 'vitest'

// The one thing a Node realm cannot stand in for: a real browser loading an
// unpacked MV3 extension, and the extension's own service worker calling the
// live endpoint with the host permissions its manifest grants. The sibling
// `test/extension.spec.ts` simulates that realm; this one is the realm.
//
// It needs a Chrome/Chromium binary — `DEEPLX_CHROME_PATH`, `CHROME_PATH` or
// `CHROME_BIN`, or one of the usual locations — and the published entry, so
// `yarn build` first. Without either it skips, which keeps a plain Node runner
// green; because it talks to the network it lives in `e2e/` and runs as
// `yarn test:e2e` rather than as part of `yarn test`.

const packageDirectory = fileURLToPath(
  new URL('../packages/@deeplx/core/', import.meta.url),
)
const publishedEntry = path.join(packageDirectory, 'lib/index.js')
const browserEntry = path.join(packageDirectory, 'test/browser-entry.ts')

// The endpoint answers in a second or two; this is the "nothing ever ran" bound.
const reportTimeout = 60_000

const HTTP_STATUS_OK = 200
const HTTP_STATUS_BAD_REQUEST = 400

function findBrowser(): string | undefined {
  const candidates: Array<string | undefined> = [
    process.env.DEEPLX_CHROME_PATH,
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    // What `playwright install chromium` fetches, which is what CI uses.
    playwrightBrowser(),
    // Chrome for Testing's user-level layout.
    path.join(homedir(), '.cache/browsers/chrome/chrome-linux64/chrome'),
    // A distribution package. Chromium and Chrome for Testing only: branded
    // stable Chrome 137 and later ignores --load-extension, which would leave
    // this test waiting for an extension that never loads.
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  return candidates.find(
    candidate =>
      typeof candidate === 'string' &&
      existsSync(candidate) &&
      !reportsBrandedChrome(candidate),
  )
}

// Whatever `playwright install chromium` fetched: its own resolution knows the
// per-platform cache directory (`~/Library/Caches` on macOS, `~/.cache`
// elsewhere, `PLAYWRIGHT_BROWSERS_PATH` when set) and the executable layout for
// the installed revision, neither of which is worth guessing here.
function playwrightBrowser(): string | undefined {
  try {
    return chromium.executablePath()
  } catch {
    return undefined
  }
}

// Branded stable Chrome drops --load-extension, so a binary that introduces
// itself as one is of no use here. Chromium and Chrome for Testing still honour
// it — the "for Testing" build is what runs this suite locally.
function reportsBrandedChrome(candidate: string): boolean {
  try {
    const version = String(
      execFileSync(candidate, ['--version'], { encoding: 'utf8' }),
    )
    return (
      version.startsWith('Google Chrome') && !version.includes('for Testing')
    )
  } catch {
    return false
  }
}

// What the service worker posts back. `data` is the string `translate` resolves
// to; `error.cause` is the result object it throws for an error result, so a
// refusal keeps the contract's `code` and `message` rather than a bare string.
interface ExtensionReport {
  contract?: {
    cause?: { code?: number; message?: string }
    message?: string
    name?: string
    threw: boolean
  }
  data?: string
  error?: {
    cause?: { code?: number; message?: string }
    message?: string
    name?: string
  }
  extensionId: string
  ok: boolean
  userAgent: string
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message: () => string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message()))
    }, timeout)
  })
  try {
    return await Promise.race([promise, expiry])
  } finally {
    clearTimeout(timer)
  }
}

function createReportServer() {
  const reportRef: { resolve?: (report: ExtensionReport) => void } = {}
  const report = new Promise<ExtensionReport>(resolve => {
    reportRef.resolve = resolve
  })
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    request.on('end', () => {
      response.writeHead(HTTP_STATUS_OK, { 'access-control-allow-origin': '*' })
      response.end('ok')
      reportRef.resolve?.(
        JSON.parse(Buffer.concat(chunks).toString('utf8')) as ExtensionReport,
      )
    })
  })
  const address = new Promise<number>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const found = server.address()
      if (found && typeof found === 'object') {
        resolve(found.port)
      } else {
        reject(new Error('the report server did not expose a TCP port'))
      }
    })
  })
  return { address, report, server }
}

// A skipped test counts as a pass, and this suite is the only thing the e2e job
// runs, so on CI a missing browser or bundle has to fail rather than skip.
// Locally it skips, which keeps a plain Node runner green.
function unavailable(skip: (note: string) => void, reason: string): void {
  if (process.env.CI) {
    throw new Error(reason)
  }
  skip(reason)
}

test('a real extension service worker translates through the built bundle', async ({
  skip,
}) => {
  const browserPath = findBrowser()
  if (!browserPath) {
    unavailable(
      skip,
      'no usable Chromium binary found; set DEEPLX_CHROME_PATH (or CHROME_PATH/CHROME_BIN) to a Chromium build — branded Google Chrome 137 and later ignores --load-extension',
    )
    // `skip` throws; the `return` is what ends the branch for TypeScript.
    return
  }
  if (!existsSync(publishedEntry)) {
    unavailable(skip, 'the published bundle is missing; run `yarn build` first')
    return
  }

  const { address, report, server } = createReportServer()
  const extensionDirectory = mkdtempSync(
    path.join(tmpdir(), 'deeplx-extension-'),
  )
  const profileDirectory = mkdtempSync(path.join(tmpdir(), 'deeplx-profile-'))

  let browser: ChildProcess | undefined
  try {
    const port = await address

    // Bundle the published entry the way a consumer's bundler would: through
    // `exports` and the `browser` field, so `random.js` becomes its Web Crypto
    // twin and no Node built-in survives. The extension cannot import the
    // published ESM files directly for exactly that reason.
    const built = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: browserEntry,
          formats: ['es'],
          fileName: 'core',
        },
      },
    })
    const [output] = Array.isArray(built) ? built : [built]
    if (!('output' in output)) {
      throw new Error('expected the vite build to report its output')
    }
    const chunks = output.output.filter(item => item.type === 'chunk')
    if (chunks.length !== 1) {
      throw new Error(
        `expected the browser bundle to be one chunk, got ${chunks.length}`,
      )
    }
    const code = chunks[0].code

    const manifest = {
      manifest_version: 3,
      name: 'deeplx e2e',
      version: '0.0.0',
      host_permissions: [
        'https://www.deepl.com/*',
        'https://oneshot-free.www.deepl.com/*',
        'https://oneshot-pro.www.deepl.com/*',
        // The test's own reporting channel. The three above are the ones the
        // library documents for the call itself.
        'http://127.0.0.1/*',
      ],
      permissions: ['cookies', 'declarativeNetRequestWithHostAccess'],
      background: { service_worker: 'sw.js', type: 'module' },
    }

    // A module service worker with the manifest's host permissions: the same
    // place the README tells an extension to make this call. Importing from the
    // bundle is what a consumer does; the port is baked in because the manifest
    // cannot pass one.
    const serviceWorker = `
import { translate } from './core.js'

const send = async payload => {
  await fetch('http://127.0.0.1:${port}/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// The refusal contract, which needs no endpoint: an invalid target language is
// answered locally, so translate must throw the Error it promises, with the
// result object as its cause.
const refusal = async () => {
  try {
    await translate('Hallo', 'not-a-language', 'DE', { skipWarm: true })
    return { threw: false }
  } catch (error) {
    return {
      cause: error?.cause ?? null,
      message: error?.message,
      name: error?.name,
      threw: true,
    }
  }
}

let started = false
const run = async () => {
  if (started) {
    return
  }
  started = true
  const context = {
    contract: await refusal(),
    extensionId: chrome.runtime.id,
    userAgent: navigator.userAgent,
  }
  try {
    // The public entry point, from the bundle a consumer's bundler produces.
    const data = await translate('Hallo', 'EN', 'DE', { skipWarm: true })
    await send({ ...context, data, ok: true })
  } catch (error) {
    await send({
      ...context,
      error: {
        cause: error?.cause ?? null,
        message: error?.message,
        name: error?.name,
      },
      ok: false,
    })
  }
}

// Chrome evaluates the worker for the install event; the top-level call covers
// a worker that already exists, and \`started\` keeps the report single.
chrome.runtime.onInstalled.addListener(() => {
  void run()
})
void run()
`

    writeFileSync(
      path.join(extensionDirectory, 'manifest.json'),
      JSON.stringify(manifest),
    )
    writeFileSync(path.join(extensionDirectory, 'core.js'), code)
    writeFileSync(path.join(extensionDirectory, 'sw.js'), serviceWorker)

    const running = spawn(
      browserPath,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${profileDirectory}`,
        `--load-extension=${extensionDirectory}`,
        `--disable-extensions-except=${extensionDirectory}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    browser = running

    // Chrome's own chatter (dbus, GCM) is expected here; keep the tail in case
    // the extension never reports, so the failure says what the browser said.
    const diagnostics: string[] = []
    running.stderr.on('data', (chunk: Buffer) => {
      diagnostics.push(chunk.toString('utf8'))
      if (diagnostics.length > 50) {
        diagnostics.shift()
      }
    })

    const exited = new Promise<never>((_resolve, reject) => {
      running.once('exit', (code, signal) => {
        reject(
          new Error(
            `Chrome exited before the extension reported (code ${String(code)}, signal ${String(signal)})`,
          ),
        )
      })
    })
    // `Promise.race` stays subscribed to a promise that lost the race, so an
    // exit after the report has arrived settles `exited` without effect.
    const raw = await withTimeout(
      Promise.race([report, exited]),
      reportTimeout,
      () =>
        `the extension did not report within ${reportTimeout}ms; Chrome said:\n${diagnostics.join('')}`,
    )
    console.log('extension report:', JSON.stringify(raw))

    // `extensionId` only exists if the extension loaded and its worker ran; the
    // request only reaches here if that worker could reach the loopback server.
    expect(raw.extensionId).toMatch(/^[a-p]{32}$/)
    expect(raw.userAgent).toContain('Mozilla/5.0')
    // The browser's own profile travels, never the iOS one the Node path pins.
    expect(raw.userAgent).not.toContain('DeepL/')

    // The refusal contract, proven in a real browser: an Error whose message is
    // the result's, with the result itself as the cause.
    expect(raw.contract?.threw).toBe(true)
    expect(raw.contract?.name).toBe('Error')
    expect(raw.contract?.cause?.code).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(raw.contract?.message).toBe(raw.contract?.cause?.message)

    // `translate` resolves to the translated string, or throws the result object
    // it produced — the worker reports whichever happened, so both arms prove
    // the published bundle ran and answered through its contract. The live
    // endpoint's verdict is recorded rather than asserted away: a refusal or a
    // transport failure is a real result, as long as it carries a numeric code.
    if (raw.ok) {
      expect(raw.data).toBeTypeOf('string')
      expect(raw.data?.length).toBeGreaterThan(0)
      expect(raw.data).toBe('Hello')
    } else {
      expect(raw.error?.cause?.code).toBeTypeOf('number')
      expect(raw.error?.message).toBeTypeOf('string')
      console.warn(
        'the extension reached `translate`, but the endpoint refused:',
        JSON.stringify(raw),
      )
    }
  } finally {
    if (browser?.exitCode === null && browser.signalCode === null) {
      browser.kill('SIGKILL')
      await new Promise<void>(resolve => {
        browser?.once('exit', () => {
          resolve()
        })
      })
    }
    server.closeAllConnections()
    await new Promise<void>(resolve => {
      server.close(() => {
        resolve()
      })
    })
    rmSync(extensionDirectory, { force: true, recursive: true })
    rmSync(profileDirectory, { force: true, recursive: true })
  }
})
