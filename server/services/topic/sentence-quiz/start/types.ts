export type TopicSentenceItem = {
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

export type TopicSentenceData = {
  topic: string | number;
  title: string;
  totalWords: number;
  totalSentences: number;
  items: TopicSentenceItem[];
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
  mode: "topic-sentences";
  scope: "topic";
  slug: string;
  createdAt: string;
  allowedPairs: Array<{
    wordId: string;
    sentenceId: string;
  }>;
};

export type SentencePoolResult = {
  topic: string
  title: string
  totalWords: number
  totalSentences: number
  items: TopicSentenceItem[]
}

export type LoadSentencePoolInput = {
  userId: string;
  slug: string;
  scope: "topic";
  cdnBase: string;
};
