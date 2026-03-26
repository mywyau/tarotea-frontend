export type LevelSentenceItem = {
  sentenceId: string;
  sentence: string;
  jyutping: string;
  meaning: string;
  sourceWordId: string;
  sourceWord: string;
  sourceWordJyutping: string;
  sourceWordMeaning: string;
  tags: string[];
  sourceFile: string;
};

export type LevelSentenceData = {
  level: string | number;
  title: string;
  totalWords: number;
  totalSentences: number;
  items: LevelSentenceItem[];
};

export type SentenceProgress = {
  seenCount: number;
  lastSeenAt: string | Date | null;
};

export type CachedSentenceProgress = {
  seenCount?: number;
  lastSeenAt?: string | null;
};

export type WordProgressRow = {
  word_id: string;
  xp: number;
  streak: number;
};

export type QuizSession = {
  version: 1;
  mode: "level-sentences";
  scope: "level";
  slug: string;
  createdAt: string;
  allowedPairs: Array<{
    wordId: string;
    sentenceId: string;
  }>;
};

export type SentencePoolResult = {
  level: string
  title: string
  totalWords: number
  totalSentences: number
  items: LevelSentenceItem[]
}

export type LoadSentencePoolInput = {
  userId: string;
  slug: string;
  scope: "level";
  cdnBase: string;
};
