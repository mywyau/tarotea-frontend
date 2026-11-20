import type { WordEntry } from '~/types/word'

type SearchWord = Pick<WordEntry, 'word' | 'meaning' | 'jyutping'>

export function filterWordCategories<T extends { words: SearchWord[] }>(categories: T[], query: string) {
  const term = query.trim().toLowerCase()
  if (!term) return categories

  const compactTerm = term.replace(/\s+/g, '')
  const hasTone = /[1-6]/.test(term)

  function matches(word: SearchWord) {
    if (word.word.includes(term) || word.meaning.toLowerCase().includes(term)) return true

    const jyutping = word.jyutping.toLowerCase().replace(/\s+/g, '')
    return (hasTone ? jyutping : jyutping.replace(/[1-6]/g, '')).includes(compactTerm)
  }

  return categories
    .map(category => ({ ...category, words: category.words.filter(matches) }))
    .filter(category => category.words.length > 0)
}
