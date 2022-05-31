import { generateJobs } from 'deeplx'

test('generate jobs with one sentence', () => {
  const sentences = ['Forever alone.']
  const expectedJobs = [
    {
      kind: 'default',
      raw_en_sentence: 'Forever alone.',
      raw_en_context_before: [],
      raw_en_context_after: [],
      preferred_num_beams: 3,
    },
  ]

  expect(generateJobs(sentences, 3)).toEqual(expectedJobs)
})

test('generate jobs with three sentences', () => {
  const sentences = ['First.', 'Second.', 'Third.']
  const expectedJobs = [
    {
      kind: 'default',
      raw_en_sentence: 'First.',
      raw_en_context_before: [],
      raw_en_context_after: ['Second.'],
      preferred_num_beams: 1,
    },
    {
      kind: 'default',
      raw_en_sentence: 'Second.',
      raw_en_context_before: ['First.'],
      raw_en_context_after: ['Third.'],
      preferred_num_beams: 1,
    },
    {
      kind: 'default',
      raw_en_sentence: 'Third.',
      raw_en_context_before: ['First.', 'Second.'],
      raw_en_context_after: [],
      preferred_num_beams: 1,
    },
  ]

  expect(generateJobs(sentences)).toEqual(expectedJobs)
})
