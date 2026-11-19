import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isPronunciationPracticePath,
  PRONUNCIATION_PRACTICE_ENABLED,
} from '../config/features'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('pronunciation feature availability', () => {
  it('keeps pronunciation practice disabled', () => {
    expect(PRONUNCIATION_PRACTICE_ENABLED).toBe(false)
  })

  it('recognises every public pronunciation route family', () => {
    expect(isPronunciationPracticePath('/echo-forest/word-id')).toBe(true)
    expect(isPronunciationPracticePath('/echo-lab/pronunciation-check/topic/family/sentences/word/v2/0')).toBe(true)
    expect(isPronunciationPracticePath('/quiz/level-one/echo-gecko')).toBe(true)
    expect(isPronunciationPracticePath('/topic/quiz/echo-gecko/family-members')).toBe(true)
    expect(isPronunciationPracticePath('/topic/word/family-members/word-id')).toBe(false)
  })

  it('blocks pronunciation APIs before their handlers run', () => {
    const middleware = read('server/middleware/disable-pronunciation.ts')
    expect(middleware).toContain("path === '/api/pronunciation-check-v3'")
    expect(middleware).toContain("path === '/api/pronunciation-tone-word-v1'")
    expect(middleware).toContain("path.startsWith('/api/echo-lab/')")
    expect(middleware).toContain('statusCode: 503')
  })
})
