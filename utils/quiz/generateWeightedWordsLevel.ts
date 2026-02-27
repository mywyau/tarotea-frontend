export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export interface WeightedWord {
  id: string
}

interface Options {
  totalQuestions?: number
  weakestRatio?: number
}

export function generateWeightedWordsLevel<T extends WeightedWord>(
  words: T[],
  weakestIds: string[],
  options?: Options
): T[] {
  const totalQuestions = options?.totalQuestions ?? 20
  const weakestRatio = options?.weakestRatio ?? 0.7

  if (!words.length) return []

  // No weakest words → simple random
  if (!weakestIds.length) {
    return shuffle(words).slice(0, totalQuestions)
  }

  const weakestSet = new Set(weakestIds)

  const weakestPool = shuffle(
    words.filter(w => weakestSet.has(w.id))
  )

  const nonWeakestPool = shuffle(
    words.filter(w => !weakestSet.has(w.id))
  )

  const weakestTarget = Math.floor(totalQuestions * weakestRatio)

  const selected: T[] = []

  selected.push(...weakestPool.slice(0, weakestTarget))

  selected.push(
    ...nonWeakestPool.slice(0, totalQuestions - selected.length)
  )

  // Fill remaining if needed
  if (selected.length < totalQuestions) {
    const remaining = shuffle(
      words.filter(w => !selected.some(s => s.id === w.id))
    )

    selected.push(
      ...remaining.slice(0, totalQuestions - selected.length)
    )
  }

  return shuffle(selected)
}