import { afterEach, describe, expect, it, vi } from 'vitest'
import { missedPracticeQuestions, useQuizResults, type QuizResult } from '../composables/useQuizResults'

const result: QuizResult = {
  title: 'Quiz Complete',
  correct: 1,
  incorrect: 0,
  elapsed: '0:12',
  xpEarned: 5,
  xpLost: 0,
  retryTo: '/quiz/level-one/word/start-quiz',
  backTo: '/quiz',
  review: { basePath: '/level/level-one/word', correct: [{ id: 'nei5', word: '你' }], incorrect: [] },
}

afterEach(() => vi.unstubAllGlobals())

describe('missed-word practice', () => {
  const q = { wordId: 'nei5', prompt: 'you', options: ['我', '你', '我'], correctIndex: 1 }

  it('keeps each missed target once with its original answer and distractors', () => {
    const questions = [q, { ...q, wordId: 'ngo5' }, q]
    const answers = [{ wordId: 'ngo5', correct: true }, { wordId: 'nei5', correct: false }]
    expect(missedPracticeQuestions(questions, answers)).toEqual([{
      wordId: 'nei5', prompt: 'you', choices: ['我', '你'], correctAnswer: '你',
      audioFile: 'nei5.mp3', listening: false,
    }])
    expect(missedPracticeQuestions(questions, [{ wordId: 'nei5', correct: true }])).toEqual([])
  })

  it('replays the missed sentence recording without giving away its translation', () => {
    const questions = ['example-1', 'example-2'].map(sentenceId => ({ ...q, sentenceId }))
    const answers = questions.map(item => ({ ...item, correct: item.sentenceId === 'example-1' }))
    expect(missedPracticeQuestions(questions, answers, true)).toMatchObject([{
      prompt: 'Which word did you hear in the sentence?', audioFile: 'example-2.mp3', listening: true,
    }])
    expect(missedPracticeQuestions([{ ...q, audioKey: 'alternate.mp3' }], [{ ...q, correct: false }], true)[0]?.audioFile).toBe('alternate.mp3')
  })
})

describe('word quiz results navigation', () => {
  it('opens results with the score and an identifiable submission before any XP request', async () => {
    const replace = vi.fn()
    const fetch = vi.fn()
    vi.stubGlobal('useRouter', () => ({ replace }))
    vi.stubGlobal('$fetch', fetch)
    const answers = [{ wordId: 'nei5', correct: true }]

    await useQuizResults()(result, { userId: 'learner', mode: 'grind-level', answers })

    const [{ path, state }] = replace.mock.calls[0]!
    expect(path).toBe('/quiz/results')
    expect(JSON.parse(state.quizResult)).toEqual({
      ...result,
      pendingSave: { attemptId: expect.any(String), userId: 'learner', mode: 'grind-level', answers },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('opens guest topic results with the review and no XP submission', async () => {
    const replace = vi.fn()
    vi.stubGlobal('useRouter', () => ({ replace }))
    const guest: QuizResult = { ...result, xpEarned: 0, backTo: '/topics/quiz' }

    await useQuizResults()(guest)

    expect(replace).toHaveBeenCalledWith({
      path: '/topic/quiz/results', state: { quizResult: JSON.stringify(guest) },
    })
  })
})
