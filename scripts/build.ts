import fs from 'node:fs/promises'

import { request } from '@octokit/request'

/** @link https://github.com/sindresorhus/github-markdown-css */
const { data } = await request('POST /markdown', {
  text: await fs.readFile('README.md', 'utf8'),
  token: process.env.GITHUB_TOKEN,
})

await fs.writeFile(
  'public/index.html',
  /* HTML */ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>DeepLx</title>
        <link
          rel="icon"
          type="image/png"
          href="/favicon_16.png"
          sizes="16x16"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon_32.png"
          sizes="32x32"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon_96.png"
          sizes="96x96"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"
        />
        <style>
          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
          }

          @media (max-width: 767px) {
            .markdown-body {
              padding: 15px;
            }
          }
        </style>
      </head>
      <body>
        <article class="markdown-body">${data}</article>
      </body>
    </html>
  `,
)
