import { describe, expect, it } from 'vitest'
import { buildSentenceQuiz, buildWordListeningQuiz, hasSpokenTarget } from '../utils/quiz/buildSentenceQuiz'

function item(word: string, sound: string, sentence = word, jyutping = sound) {
  return {
    sourceWordId: word, sourceWord: word, sourceWordJyutping: sound,
    sentenceId: word + '-example-1', sentence, jyutping,
    meaning: 'translation', sourceWordMeaning: 'gloss', sourceFile: '', tags: [],
  }
}

describe('Sentence word listening', () => {
  const target = item('你', 'nei5', '你去邊呀？', 'nei5heoi3 bin1 aa3?')
  const peers = [item('佢', 'keoi5'), item('我', 'ngo5'), item('你哋', 'nei5 dei6')]
  const words = [target, ...peers, item('去', 'heoi3'), item('亞', 'aa3'), item('食', 'sik6')]
  const categories = new Map(words.map(w => [w.sourceWordId, w.sourceWord === '食' ? 'verbs' : 'pronouns']))

  it('requires both the written target and its complete spoken syllables', () => {
    expect(hasSpokenTarget(target)).toBe(true)
    expect(hasSpokenTarget(item('我哋', 'ngo5 dei6', '我哋', 'ngo5dei6.'))).toBe(true)
    expect(hasSpokenTarget(item('你', 'nei5', '你', 'nei4'))).toBe(false)
    expect(hasSpokenTarget(item('你', 'nei5', '呢', 'nei5'))).toBe(false)
    expect(hasSpokenTarget(item('五', 'ng5', '五', 'pang5'))).toBe(false)
  })

  it('prefers related choices and excludes other words or homophones heard in the clip', () => {
    const q = buildWordListeningQuiz(words, categories)[0]!
    expect(new Set(q.options)).toEqual(new Set(['你', '我', '佢', '你哋']))
    expect(q.options[q.correctIndex]).toBe('你')
    expect(q.correctSentence).toBe(target.sentence)
    expect(q.sentenceId).toBe(target.sentenceId)
    expect(buildSentenceQuiz(words).find(q => q.wordId === '你')?.options).toContain(target.sentence)
  })

  it('skips questions with fewer than three distinct safe distractors', () => {
    const ambiguous = [target, item('我', 'ngo5'), item('我', 'ngo5'), item('娥', 'ngo5'), item('佢', 'keoi5')]
    expect(buildWordListeningQuiz(ambiguous, categories).some(q => q.wordId === '你')).toBe(false)
  })
})
