export type ReviewedWord = { id: string; word: string }

export interface QuizResult {
  title: string
  correct: number
  incorrect: number
  elapsed: string
  xpEarned: number
  xpLost: number
  retryTo: string
  backTo: '/quiz' | '/topics/quiz'
  review?: {
    basePath: string
    correct: ReviewedWord[]
    incorrect: ReviewedWord[]
  }
}

export function reviewedWords(words: (ReviewedWord | undefined)[]): ReviewedWord[] {
  return words.flatMap(word => word ? [{ id: word.id, word: word.word }] : [])
}

export function useQuizResults() {
  const router = useRouter()
  return (result: QuizResult) => router.replace({
    path: result.backTo === '/quiz' ? '/quiz/results' : '/topic/quiz/results',
    state: { quizResult: JSON.stringify(result) },
  })
}
