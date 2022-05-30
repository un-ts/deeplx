import { expect, test } from 'vitest'

import { splitIntoSentences } from '../src/api.js'

test('splitIntoSentences', async () => {
  const text =
    "This is a text. This text has words. The end? The end! I'm not sure... who knows."

  const expected_sentences = [
    'This is a text.',
    'This text has words.',
    'The end?',
    'The end!',
    "I'm not sure... who knows.",
  ]

  const sentences = await splitIntoSentences(text)
  expect(sentences).toEqual(expected_sentences)
})
