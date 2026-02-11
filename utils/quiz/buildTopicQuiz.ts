import type { TopicWord } from '@/types/topic'

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5)
}

export function buildTopicQuiz(words: TopicWord[]) {
  return words.map(word => {
    const incorrect = shuffle(
      words
        .filter(w => w.id !== word.id)
        .map(w => w.meaning)
    ).slice(0, 3)

    const options = shuffle([word.meaning, ...incorrect])

    return {
      word: word.word,
      jyutping: word.jyutping,
      options,
      correctIndex: options.indexOf(word.meaning),
      type: 'text' as const
    }
  })
}
