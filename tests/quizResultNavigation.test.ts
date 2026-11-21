import { afterEach, describe, expect, it, vi } from 'vitest'
import { useQuizResults, type QuizResult } from '../composables/useQuizResults'

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
