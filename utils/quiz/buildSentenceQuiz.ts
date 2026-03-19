// ~/utils/quiz/buildSentenceQuiz.ts
export type SentenceQuizQuestion = {
  sentenceId: string
  prompt: string
  jyutping: string
  correctMeaning: string
  options: string[]
  correctIndex: number
  sourceWord: string
  sourceWordMeaning: string
}

type TopicSentenceItem = {
  sentenceId: string
  sentence: string
  jyutping: string
  meaning: string
  sourceWordId: string
  sourceWord: string
  sourceWordJyutping: string
  sourceWordMeaning: string
  tags: string[]
  sourceFile: string
}

export function buildSentenceQuiz(items: TopicSentenceItem[]): SentenceQuizQuestion[] {
  const allMeanings = items.map(i => i.meaning)

  return shuffleFisherYates(items).map((item) => {
    const wrongOptions = shuffleFisherYates(
      allMeanings.filter(m => m !== item.meaning)
    ).slice(0, 3)

    const options = shuffleFisherYates([
      item.meaning,
      ...wrongOptions
    ])

    return {
      sentenceId: item.sentenceId,
      prompt: item.sentence,
      jyutping: item.jyutping,
      correctMeaning: item.meaning,
      options,
      correctIndex: options.findIndex(o => o === item.meaning),
      sourceWord: item.sourceWord,
      sourceWordMeaning: item.sourceWordMeaning
    }
  })
}