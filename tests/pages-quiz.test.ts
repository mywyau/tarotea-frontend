import { describe, it, expect } from 'vitest'
import { readPage, readProjectFile } from './pageTestUtils'

describe('quiz page contracts', () => {
  it('level quiz hub keeps enabled mode routes and omits paused pronunciation practice', () => {
    const source = readPage('quiz/index.vue')

    expect(source).not.toContain('Progress through structured and progressively trickier Cantonese content.')
    expect(source).toContain('/quiz/${levelId}/word/start-quiz')
    expect(source).toContain('/quiz/${levelId}/audio/start-quiz')
    expect(source).toContain('/quiz/${levelId}/sentences/no-audio/start-quiz')
    expect(source).toContain('/quiz/${levelId}/sentences/audio/start-quiz')
    expect(source).not.toContain('/quiz/${levelId}/echo-gecko')
    expect(source).toContain('to="/topics/quiz">Topic quizzes')
  })

  it('level quiz start pages keep middleware and start CTA routes', () => {
    const wordStart = readPage('quiz/[slug]/word/start-quiz.vue')
    const audioStart = readPage('quiz/[slug]/audio/start-quiz.vue')
    const sentenceAudioStart = readPage('quiz/[slug]/sentences/audio/v3/start-quiz.vue')

    expect(wordStart).toContain("middleware: ['level-quiz-access']")
    expect(wordStart).toContain('Start vocabulary quiz')
    expect(wordStart).toContain('`/quiz/${slug}/word/test`')

    expect(audioStart).toContain("middleware: ['level-quiz-access']")
    expect(audioStart).toContain('Start audio quiz')
    expect(audioStart).toContain('`/quiz/${slug}/audio/test`')

    expect(sentenceAudioStart).toContain("middleware: ['level-quiz-access']")
    expect(sentenceAudioStart).toContain('Sentence Audio Quiz')
    expect(sentenceAudioStart).toContain('`/quiz/${slug}/sentences/audio`')
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
    expect(topicQuizHub).toContain('/topic/quiz/vocabulary/word/start-quiz/${topicId}')

    expect(topicWordStart).toContain("middleware: ['topic-access-quiz']")
    expect(topicWordStart).toContain('Vocabulary Quiz')
    expect(topicWordStart).toContain('`/topic/quiz/vocabulary/word/${topicSlug}`')

    expect(topicSentenceStart).toContain("middleware: ['topic-access-quiz']")
    expect(topicSentenceStart).toContain('Sentence quiz')
    expect(topicSentenceStart).toContain('`/topic/quiz/sentences/no-audio/${topicSlug}`')

    expect(dailyStart).toContain('middleware: "logged-in"')
    expect(dailyStart).toContain('Daily 20 Questions')
    expect(dailyStart).toContain('NuxtLink to="/daily/vocab"')
  })

  it('sends authentication when loading a level audio quiz', () => {
    const source = readPage('quiz/[slug]/audio/v2/test.vue')

    expect(source).toContain("isLoggedIn.value ? 'authed' : 'anon'")
    expect(source).toContain('const token = await getAccessToken()')
    expect(source).toContain('Authorization: `Bearer ${token}`')
  })

  it('keeps level and topic audio quizzes compact and concealed before answering', () => {
    const levelAudio = readPage('quiz/[slug]/audio/v2/test.vue')
    const topicAudio = readPage('topic/quiz/vocabulary/audio/v5/[topic]/index.vue')

    for (const source of [levelAudio, topicAudio]) {
      expect(source).toContain('class="audio-answer-grid grid grid-cols-2"')
      expect(source).toContain('audio-answer-tile')
      expect(source).not.toContain('answer-tile aspect-square')
      expect(source).toContain('v-if="answered && currentWord"')
      expect(source.match(/{{ currentWord\.word }}/g)).toHaveLength(1)
      expect(source).toContain('Which word did you hear?')
    }
  })

  it('reveals target-word feedback only after a level or topic sentence answer', () => {
    const target = readProjectFile('components/SentenceQuizTarget.vue')
    expect(target).toContain(":inert=\"!answered\"")
    expect(target).toContain("filter: answered ? undefined : 'blur(8px)'")
    expect(target).toContain('{{ word }}')
    expect(target).toContain('{{ jyutping }}')
    expect(target).toContain("width: Math.min(xp / masteryXp * 100, 100) + '%'")
    for (const source of [
      readPage('quiz/[slug]/sentences/no-audio/v3/index.vue'),
      readPage('topic/quiz/sentences/no-audio/[topic]/v3/index.vue'),
      readProjectFile('components/SentenceListeningQuestion.vue'),
    ]) {
      expect(source).toContain('<SentenceQuizTarget :answered="answered"')
    }
  })

  it('moves quiz progress into the focused header and supports automatic advance', () => {
    const progress = readProjectFile('components/QuizHeaderProgress.vue')
    const shell = readProjectFile('components/BlankNavBar.vue')

    expect(shell).toContain('id="quiz-header-progress"')
    expect(progress).toContain('quiz-auto-advance')
    expect(progress).toContain('AUTO_ADVANCE_DELAY_MS = 2500')
    expect(progress).toContain("emit('advance')")
    expect(progress).toContain("role=\"switch\"")
  })

  it('uses a responsive, non-flipping completion summary across quiz types', () => {
    const stats = readProjectFile('components/QuizCompletionFlipStats.vue')
    const actions = readProjectFile('components/QuizCompletionActions.vue')
    const completionPages = [
      'quiz/[slug]/word/v2/test.vue',
      'quiz/[slug]/audio/v2/test.vue',
      'quiz/[slug]/sentences/no-audio/v3/index.vue',
      'quiz/[slug]/sentences/audio/v3/index.vue',
      'topic/quiz/vocabulary/word/v5/[topic].vue',
      'topic/quiz/vocabulary/audio/v5/[topic]/index.vue',
      'topic/quiz/sentences/no-audio/[topic]/v3/index.vue',
      'topic/quiz/sentences/audio/[topic]/v3/index.vue',
    ]

    expect(stats).toContain('completion-stat-grid')
    expect(stats).toContain('Quiz completion stats')
    expect(stats).toContain('showScore: true')
    expect(stats).toContain("scrollIntoView({ block: 'start' })")
    expect(stats).not.toContain('is-flipped')
    expect(actions).toContain("retryLabel: 'Try again'")
    expect(actions).toContain("backLabel: 'Choose another quiz'")

    const results = readPage('quiz/results.vue')
    expect(results).toContain('<QuizCompletionActions')
    expect(results).toContain(':show-score="!result.review"')
    expect(results).toContain('group.count')
    for (const page of completionPages) {
      const source = readPage(page)
      expect(source).toContain('openQuizResults({')
      expect(source).toContain("'View results' : 'Next'")
      expect(source).not.toContain('<QuizCompletionActions')
      expect(source).not.toContain('class="quiz-completion space-y-6"')
    }
  })

  it('shows a manual first-play prompt when browser autoplay is blocked', () => {
    const audioButton = readProjectFile('components/AudioButton.vue')
    const floatingAudio = readProjectFile('components/FloatingAudioButton.vue')

    expect(audioButton).toContain("name === 'NotAllowedError'")
    expect(audioButton).toContain("emit('autoplayBlocked')")
    expect(floatingAudio).toContain('Tap to hear the first word')
    expect(floatingAudio).toContain('@played="autoplayBlocked = false"')
  })

  it('gives guests full sentence quizzes for free levels', () => {
    const source = readProjectFile('server/api/sentences/v3/start-v2.get.ts')

    expect(source).toContain(
      'if (!isFreeLevel(levelNumber)) {\n    if (!userId) {'
    )
  })
})
