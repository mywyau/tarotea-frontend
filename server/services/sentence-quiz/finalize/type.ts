export type Answer = {
  wordId: string;
  sentenceId: string;
  correct: boolean;
};

export type QuizMode =
  | "level-sentences"
  | "topic-sentences"
  | "level-sentences-audio"
  | "topic-sentences-audio";

export type FinalizeBody = {
  sessionKey?: string;
  mode?: QuizMode;
  answers?: Answer[];
};

export type QuizSession = {
  version: 1;
  mode: QuizMode;
  scope: "level" | "topic";
  slug: string;
  createdAt: string;
  allowedPairs: Array<{
    wordId: string;
    sentenceId: string;
  }>;
};

export type SentenceAggregate = {
  wordId: string;
  sentenceId: string;
  seenInc: number;
  correctInc: number;
  wrongInc: number;
};

export type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};
