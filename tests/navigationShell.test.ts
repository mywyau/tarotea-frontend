import { describe, expect, it } from 'vitest'
import { getFocusedLearningExitPath, isFocusedLearningPath } from '../utils/navigation/focusMode'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('application shell navigation', () => {
  it('uses focus mode for active exercises, but not their introduction screens', () => {
    expect(isFocusedLearningPath('/quiz/hsk1/word/test')).toBe(true)
    expect(isFocusedLearningPath('/quiz/hsk1/word/start-quiz')).toBe(false)
    expect(isFocusedLearningPath('/topic/quiz/vocabulary/word/survival-essentials')).toBe(true)
    expect(isFocusedLearningPath('/topic/quiz/vocabulary/word/start-quiz/survival-essentials')).toBe(false)
    expect(isFocusedLearningPath('/dojo/topic/jyutping/training/food')).toBe(true)
    expect(isFocusedLearningPath('/dojo/topic/jyutping/training/food/start')).toBe(false)
    expect(isFocusedLearningPath('/topics')).toBe(false)
  })

  it('exits focused exercises to a stable selection screen', () => {
    expect(getFocusedLearningExitPath('/quiz/hsk1/word/test')).toBe('/quiz')
    expect(getFocusedLearningExitPath('/topic/quiz/vocabulary/word/food')).toBe('/topics/quiz')
    expect(getFocusedLearningExitPath('/dojo/level/chinese/training/hsk1')).toBe('/dojo/level')
    expect(getFocusedLearningExitPath('/daily/vocab')).toBe('/')
  })

  it('provides visible desktop navigation without the rocket or backlink arrows', () => {
    const shell = read('components/BlankNavBar.vue')

    expect(shell).toContain('class="desktop-primary-nav"')
    expect(shell).toContain('class="mobile-bottom-nav"')
    expect(shell).toContain('aria-current=')
    expect(shell).toContain('aria-modal="true"')
    expect(shell).not.toContain('trigger-visibility-btn')
    expect(shell).not.toContain('<Rocket')
    expect(shell).not.toContain('ArrowLeft')
    expect(shell).toContain("label: 'Practice'")
    expect(shell).not.toContain("label: 'Dojo'")
  })
})
