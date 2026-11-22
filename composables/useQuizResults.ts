export type ReviewedWord = { id: string; word: string }

export interface MissedQuestion {
  wordId: string
  prompt: string
  choices: string[]
  correctAnswer: string
  audioFile: string
  listening: boolean
}

type QuizItem = {
  wordId: string
  sentenceId?: string
  prompt?: string
  audioKey?: string
  options: string[]
  correctIndex: number
}

export function missedPracticeQuestions(
  questions: QuizItem[],
  answers: { wordId: string; sentenceId?: string; correct: boolean }[],
  listening = false,
): MissedQuestion[] {
  const missed = new Set(answers.filter(a => !a.correct).map(a => a.sentenceId ?? a.wordId))
  const included = new Set<string>()
  const practice: MissedQuestion[] = []
  for (const q of questions) {
    const id = q.sentenceId ?? q.wordId
    const correctAnswer = q.options[q.correctIndex]
    if (!missed.has(id) || included.has(q.wordId) || !correctAnswer) continue
    const prompt = listening
      ? (q.sentenceId ? 'Which word did you hear in the sentence?' : 'Which word did you hear?')
      : q.prompt
    if (!prompt) continue
    included.add(q.wordId)
    practice.push({
      wordId: q.wordId, prompt, correctAnswer, listening,
      choices: [...new Set(q.options)],
      audioFile: q.audioKey || `${id}.mp3`,
    })
  }
  return practice
}

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
  missedQuestions?: MissedQuestion[]
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
