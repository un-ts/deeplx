import { randRange, translate } from 'deeplx'

if (process.env.CI === 'true') {
  vi.setConfig({
    testTimeout: 20_000,
  })
}

const sleep = (timeout?: number) =>
  new Promise<void>(resolve => setTimeout(resolve, timeout))

beforeEach(() => sleep(randRange(500, 1000)))

test('translate russian', async () => {
  const source_language = 'RU'
  const target_language = 'EN'
  const text = 'Я сошла с ума'
  const translation = await translate(text, target_language, source_language)
  expect(translation).toMatchInlineSnapshot(`"I've lost my mind"`)
})

test('translate chinese', async () => {
  const source_language = 'ZH'
  const target_language = 'dutch'
  const text = '你好'
  const translation = await translate(text, target_language, source_language)
  expect(translation).toMatchInlineSnapshot(`"Hoe gaat het met je?"`)
})

test('translate greek romanian', async () => {
  const source_language = 'gReEk'
  const target_language = 'rO'
  const text = 'Γεια σας'
  // @ts-expect-error -- only upper, lower or capitalize case languages are supported in TypeScript
  const translation = await translate(text, target_language, source_language)
  expect((translation as string).toLowerCase()).toMatchInlineSnapshot(
    `"bună ziua."`,
  )
})

test('translate sentence', async () => {
  const text = 'Up and down.'
  expect(await translate(text, 'NL', 'EN')).toMatchInlineSnapshot(
    `"Op en neer."`,
  )
})

test('translate sentences', async () => {
  const text =
    "His palms are sweaty, knees weak, arms are heavy. There's vomit on his sweater already, mom's spaghetti."

  const translation = await translate(text, 'DE', 'EN')

  expect(translation).toContain('Handfläche')
  expect(translation).toContain('Pullover')
  expect(translation).toContain('Spaghetti')
})

const PARAGRAPHS = [
  `She put the pen to paper but she couldn't bring herself to actually write anything. She just stared at the blank card and wondered what words she could write that would help in even a small way. She thought of a dozen ways to begin but none seemed to do justice to the situation. There were no words that could help and she knew it.`,
  `She never liked cleaning the sink. It was beyond her comprehension how it got so dirty so quickly. It seemed that she was forced to clean it every other day. Even when she was extra careful to keep things clean and orderly, it still ended up looking like a mess in a couple of days. What she didn't know was there was a tiny creature living in it that didn't like things neat.`,
  `He couldn't remember exactly where he had read it, but he was sure that he had. The fact that she didn't believe him was quite frustrating as he began to search the Internet to find the article. It wasn't as if it was something that seemed impossible. Yet she insisted on always seeing the source whenever he stated a fact.`,
  `Twenty seconds were all that was left and Richard could hear each one tick by. Fifteen seconds now remained and the panic began to fully set in. Ten seconds and he wasn't sure he had enough time. Five seconds, four, three, two, one...`,
  `You're going to make a choice today that will have a direct impact on where you are five years from now. The truth is, you'll make choice like that every day of your life. The problem is that on most days, you won't know the choice you make will have such a huge impact on your life in the future. So if you want to end up in a certain place in the future, you need to be careful of the choices you make today.`,
]

test('translate generated paragraph', async () => {
  const text = PARAGRAPHS[randRange(0, PARAGRAPHS.length - 1)]
  const translation = await translate(text, 'DE', 'EN')
  expect(translation.length).toBeGreaterThan(1)
})

test('formal german translation', async () => {
  const text = "What's your name?"
  const expected_translations = ['Wie ist Ihr Name?', 'Wie heißen Sie?']
  const translation = await translate(
    text,
    'DE',
    undefined,
    undefined,
    undefined,
    'formal',
  )
  expect(expected_translations).toContain(translation)
})

test('informal german translation', async () => {
  const text = "What's your name?"
  const expected_translations = ['Wie ist dein Name?', 'Wie heißt du?']
  const translation = await translate(
    text,
    'DE',
    undefined,
    undefined,
    undefined,
    'informal',
  )
  expect(expected_translations).toContain(translation)
})

test('invalid_formal_tone', () =>
  expect(() =>
    // @ts-expect-error
    translate('ABC', 'DE', 'EN', undefined, undefined, 'politically incorrect'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Formality tone \`politically incorrect\` not supported.]`,
  ))
