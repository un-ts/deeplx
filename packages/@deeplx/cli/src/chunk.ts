import { MAX_FREE_TEXT_LENGTH } from '@deeplx/core'

/**
 * Groups segments into as few oneshot requests as the anonymous limit allows.
 *
 * The endpoint caps the **sum** of all `text` items in one request at
 * `MAX_FREE_TEXT_LENGTH` characters rather than the number of items, so chunks
 * are built by total length, never by segment count. A segment longer than the
 * limit cannot be sent at all; it keeps its own chunk, so the library answers
 * with its 413 result instead of the CLI silently dropping it.
 */
export function chunkByLength(
  texts: readonly string[],
  limit: number = MAX_FREE_TEXT_LENGTH,
): string[][] {
  const chunks: string[][] = []
  let chunk: string[] = []
  let length = 0
  for (const text of texts) {
    const size = [...text].length
    if (length + size > limit && chunk.length > 0) {
      chunks.push(chunk)
      chunk = []
      length = 0
    }
    chunk.push(text)
    length += size
  }
  if (chunk.length > 0) {
    chunks.push(chunk)
  }
  return chunks
}
