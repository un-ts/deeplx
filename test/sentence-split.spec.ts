import { splitIntoSentences } from 'deeplx'

if (process.env.CI === 'true') {
  vi.setConfig({
    testTimeout: 20_000,
  })
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
