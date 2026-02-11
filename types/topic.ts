export interface TopicWord {
  id: string
  word: string
  jyutping: string
  meaning: string
}

export interface TopicData {
  topic: string
  title: string
  description: string
  categories: Record<string, TopicWord[]>
}
