export interface WordExample {
  sentence: string
  jyutping: string
  meaning: string
}

export interface WordAudio {
  /**
   * Path to the word audio file, relative to CDN base
   * e.g. "audio/words/maa4faan4nei5-please.mp3"
   */
  word?: string

  /**
   * Paths to example audio files, relative to CDN base
   * Order must match examples array
   */
  examples?: string[]
}

export interface WordEntry {
  /** Unique ID used for routing and lookup */
  id: string

  /** The Cantonese word or phrase */
  word: string

  /** Jyutping romanisation */
  jyutping: string

  /** English meaning / gloss */
  meaning: string

  /** Parts of speech */
  pos: string[]

  /** Usage notes / explanations */
  usage: string[]

  /** Example sentences */
  examples: WordExample[]

  /** Audio metadata */
  audio?: WordAudio

  /** Tags such as level-2, spoken, work, polite */
  tags: string[]

  /** Related word IDs */
  related: string[]
}
