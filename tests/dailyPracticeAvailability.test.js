import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const config = { public: { dailyPracticeEnabled: false } }
vi.stubGlobal('defineNuxtRouteMiddleware', handler => handler)
vi.stubGlobal('defineEventHandler', handler => handler)
vi.stubGlobal('useRuntimeConfig', () => config)
vi.stubGlobal('navigateTo', path => path)
vi.stubGlobal('getRequestURL', event => new URL(event.path, 'http://localhost'))
vi.stubGlobal('createError', options => Object.assign(new Error(options.statusMessage), options))

const { default: guardPage } = await import('../middleware/daily-practice.global')
const { default: guardApi } = await import('../server/middleware/disable-daily-practice')
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => { config.public.dailyPracticeEnabled = false })

describe('daily practice availability', () => {
  it.each(['/daily/vocab', '/daily/jyutping/v2', '/daily/v3'])('pauses and restores %s', path => {
    expect(guardPage({ path })).toBe('/feature-unavailable?feature=daily')
    config.public.dailyPracticeEnabled = true
    expect(guardPage({ path })).toBeUndefined()
  })

  it.each(['/api/daily/start', '/api/daily/vocab/v2/session', '/api/daily/jyutping/v2/finalize'])('pauses and restores %s', path => {
    expect(() => guardApi({ path })).toThrow(expect.objectContaining({ statusCode: 503 }))
    config.public.dailyPracticeEnabled = true
    expect(guardApi({ path })).toBeUndefined()
  })

  it('allows the featured word, ordinary quizzes and outstanding XP jobs while paused', () => {
    expect(guardPage({ path: '/quiz' })).toBeUndefined()
    for (const path of ['/api/word-of-the-day', '/api/daily/jyutping/v2/xp-worker', '/api/worker/xp-quiz-v5']) {
      expect(guardApi({ path })).toBeUndefined()
    }
  })
})
