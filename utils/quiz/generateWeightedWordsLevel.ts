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
    return shuffleFisherYates(words).slice(0, totalQuestions)
  }

  const weakestSet = new Set(weakestIds)

  const weakestPool = shuffleFisherYates(
    words.filter(w => weakestSet.has(w.id))
  )

  const nonWeakestPool = shuffleFisherYates(
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
    const remaining = shuffleFisherYates(
      words.filter(w => !selected.some(s => s.id === w.id))
    )

    selected.push(
      ...remaining.slice(0, totalQuestions - selected.length)
    )
  }

  return shuffleFisherYates(selected)
}