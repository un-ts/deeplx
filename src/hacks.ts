export function calculateValidTimestamp(timestamp: number, iCount: number) {
  return iCount ? timestamp + (iCount - (timestamp % iCount)) : timestamp
}

export function count(sentence: string, part: string) {
  return sentence.split(part).length - 1
}

export function generateTimestamp(sentences: string[]) {
  const now = Date.now()
  let iCount = 1
  for (const sentence of sentences) {
    iCount += count(sentence, 'i')
  }
  return calculateValidTimestamp(now, iCount)
}

export function randRange(min: number, max: number) {
  // eslint-disable-next-line sonarjs/pseudo-random
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateId() {
  const MIN = 1_000_000
  const MAX = 100_000_000
  return randRange(MIN, MAX)
}
