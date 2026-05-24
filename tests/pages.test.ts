import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readPage(file: string) {
  return readFileSync(resolve(process.cwd(), 'pages', file), 'utf8')
}

describe('frontend page contracts', () => {
  it('contact page keeps metadata title and support email link', () => {
    const source = readPage('contact.vue')

    expect(source).toContain("title: 'Contact · TaroTea'")
    expect(source).toContain('mailto:contact@tarotea.co.uk')
  })

  it('privacy notice page keeps metadata title and heading copy', () => {
    const source = readPage('privacy-notice.vue')

    expect(source).toContain("title: 'Privacy Notice · TaroTea'")
    expect(source).toContain('Privacy Notice')
    expect(source).toContain('Last updated:')
  })

  it('home page keeps SEO metadata and start-learning call to action', () => {
    const source = readPage('index.vue')

    expect(source).toContain("title: 'Learn Cantonese in 15 minutes a day'")
    expect(source).toContain('Start learning Cantonese today')
    expect(source).toContain('Current users online')
  })

  it('legal pages keep key metadata and user support details', () => {
    const terms = readPage('terms-of-service.vue')
    const refund = readPage('refund-policy.vue')

    expect(terms).toContain("title: 'Terms of Service · TaroTea'")
    expect(terms).toContain('Governing law')
    expect(terms).toContain('mailto:contact@tarotea.co.uk')

    expect(refund).toContain("title: 'Refund Policy · TaroTea'")
    expect(refund).toContain('non-refundable')
    expect(refund).toContain('mailto:billing@tarotea.co.uk')
  })

  it('auth and access pages keep sign-in and availability messaging', () => {
    const signIn = readPage('please-sign-in.vue')
    const unavailable = readPage('content-not-available.vue')
    const comingSoon = readPage('coming-soon.vue')

    expect(signIn).toContain("title: 'Please sign in · TaroTea'")
    expect(signIn).toContain('Sign in / Create account')

    expect(unavailable).toContain("title: 'Coming soon · TaroTea'")
    expect(unavailable).toContain('Content Not Available')

    expect(comingSoon).toContain("title: 'Coming soon · TaroTea'")
    expect(comingSoon).toContain('Coming soon')
  })

  it('billing and upgrade pages keep checkout recovery calls to action', () => {
    const success = readPage('billing/success.vue')
    const cancel = readPage('billing/cancel.vue')
    const upgrade = readPage('upgrade/index.vue')

    expect(success).toContain('/api/billing/me')
    expect(success).toContain('Payment successful')
    expect(success).toContain('Continue learning')

    expect(cancel).toContain('Payment cancelled')
    expect(cancel).toContain("upgrade('monthly')")

    expect(upgrade).toContain('Upgrade your plan')
    expect(upgrade).toContain("NuxtLink to=\"/refund-policy\"")
    expect(upgrade).toContain("query: { redirect: '/upgrade' }")
  })



  it('level quiz hub page keeps level mode routes and heading', () => {
    const source = readPage('quiz/index.vue')

    expect(source).toContain('Level Quiz')
    expect(source).toContain("/quiz/${levelId}/word/start-quiz")
    expect(source).toContain("/quiz/${levelId}/audio/start-quiz")
    expect(source).toContain("/quiz/${levelId}/sentences/no-audio/v3/start-quiz")
    expect(source).toContain("/quiz/${levelId}/sentences/audio/v3/start-quiz")
    expect(source).toContain("/quiz/${levelId}/echo-gecko")
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
  it('patch notes page keeps pagination and metadata contract', () => {
    const source = readPage('patch-notes.vue')

    expect(source).toContain("title: 'What’s new · TaroTea'")
    expect(source).toContain('NOTES_PER_PAGE = 5')
    expect(source).toContain('Patch notes pagination')
    expect(source).toContain('Page {{ currentPage }} of {{ totalPages }}')
  })
})
