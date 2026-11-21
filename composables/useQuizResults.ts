export type ReviewedWord = { id: string; word: string }

interface WordQuizSubmission {
  mode: 'grind-level' | 'grind-level-audio' | 'grind-topic' | 'grind-topic-audio'
  userId: string
  answers: { wordId: string; correct: boolean }[]
}

export interface QuizResult {
  title: string
  correct: number
  incorrect: number
  elapsed: string
  xpEarned: number
  xpLost: number
  retryTo: string
  backTo: '/quiz' | '/topics/quiz'
  pendingSave?: WordQuizSubmission & { attemptId: string }
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
  return (result: QuizResult, submission?: WordQuizSubmission) => {
    if (submission) {
      const attemptId = globalThis.crypto?.randomUUID?.() ?? `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`
      result = { ...result, pendingSave: { ...submission, attemptId } }
    }
    return router.replace({
      path: result.backTo === '/quiz' ? '/quiz/results' : '/topic/quiz/results',
      state: { quizResult: JSON.stringify(result) },
    })
  }
}
