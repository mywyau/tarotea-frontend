import { describe, it, expect } from 'vitest'
import { readPage, readProjectFile } from './pageTestUtils'

describe('quiz page contracts', () => {
  it('level quiz hub keeps enabled mode routes and omits paused pronunciation practice', () => {
    const source = readPage('quiz/index.vue')

    expect(source).not.toContain('Progress through structured and progressively trickier Cantonese content.')
    expect(source).toContain('/quiz/${levelId}/word/start-quiz')
    expect(source).toContain('/quiz/${levelId}/audio/start-quiz')
    expect(source).toContain('/quiz/${levelId}/sentences/no-audio/v3/start-quiz')
    expect(source).toContain('/quiz/${levelId}/sentences/audio/v3/start-quiz')
    expect(source).not.toContain('/quiz/${levelId}/echo-gecko')
    expect(source).toContain('to="/topics/quiz">Topic quizzes')
  })

  it('level quiz start pages keep middleware and start CTA routes', () => {
    const wordStart = readPage('quiz/[slug]/word/start-quiz.vue')
    const audioStart = readPage('quiz/[slug]/audio/start-quiz.vue')
    const sentenceAudioStart = readPage('quiz/[slug]/sentences/audio/v3/start-quiz.vue')

    expect(wordStart).toContain("middleware: ['level-quiz-access']")
    expect(wordStart).toContain('Start vocabulary quiz')
    expect(wordStart).toContain('`/quiz/${slug}/word/v2/test`')

    expect(audioStart).toContain("middleware: ['level-quiz-access']")
    expect(audioStart).toContain('Start audio quiz')
    expect(audioStart).toContain('`/quiz/${slug}/audio/v2/test`')

    expect(sentenceAudioStart).toContain("middleware: ['level-quiz-access']")
    expect(sentenceAudioStart).toContain('Sentence Audio Quiz')
    expect(sentenceAudioStart).toContain('`/quiz/${slug}/sentences/audio/v3`')
  })

  it('topic and daily quiz start pages keep key CTA routes', () => {
    const topicQuizHub = readPage('topics/quiz.vue')
    expect(topicQuizHub).toContain('to="/topics/quiz" aria-current="page">Topic quizzes')
    expect(topicQuizHub).not.toContain('Practice Cantonese by topic. Your weakest words appear more often as you improve.')
    const topicWordStart = readPage('topic/quiz/vocabulary/word/v5/start-quiz/[topic].vue')
    const topicSentenceStart = readPage('topic/quiz/sentences/no-audio/[topic]/v3/start-quiz.vue')
    const dailyStart = readPage('daily/vocab/v2/start-quiz.vue')

    expect(topicQuizHub).toContain("title: 'Cantonese Topic Quizzes'")
    expect(topicQuizHub).toContain('Topic Quiz')
    expect(topicQuizHub).toContain('/topic/quiz/vocabulary/word/v5/start-quiz/${topicId}')

    expect(topicWordStart).toContain("middleware: ['topic-access-quiz']")
    expect(topicWordStart).toContain('Vocabulary Quiz')
    expect(topicWordStart).toContain('`/topic/quiz/vocabulary/word/v5/${topicSlug}`')

    expect(topicSentenceStart).toContain("middleware: ['topic-access-quiz']")
    expect(topicSentenceStart).toContain('Sentence quiz')
    expect(topicSentenceStart).toContain('`/topic/quiz/sentences/no-audio/${topicSlug}/v3`')

    expect(dailyStart).toContain('middleware: "logged-in"')
    expect(dailyStart).toContain('Daily 20 Questions')
    expect(dailyStart).toContain('NuxtLink to="/daily/vocab/v2"')
  })

  it('sends authentication when loading a level audio quiz', () => {
    const source = readPage('quiz/[slug]/audio/v2/test.vue')

    expect(source).toContain("isLoggedIn.value ? 'authed' : 'anon'")
    expect(source).toContain('const token = await getAccessToken()')
    expect(source).toContain('Authorization: `Bearer ${token}`')
  })

  it('gives guests full sentence quizzes for free levels', () => {
    const source = readProjectFile('server/api/sentences/v3/start-v2.get.ts')

    expect(source).toContain(
      'if (!isFreeLevel(levelNumber)) {\n    if (!userId) {'
    )
  })
})
