import { jest } from '@jest/globals'

import { splitIntoSentences } from 'deepl-translate'

if (process.env.CI === 'true') {
  jest.setTimeout(20 * 1000)
}

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
