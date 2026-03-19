export type Word = {
  id: string
  word: string
  jyutping: string
  meaning: string
}

export type LevelData = {
  level: number
  title: string
  description: string
  categories: Record<string, Word[]>
}
