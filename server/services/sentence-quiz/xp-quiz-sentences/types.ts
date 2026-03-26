export type QuizMode =
  | "level-sentences"
  | "topic-sentences"
  | "level-sentences-audio"
  | "topic-sentences-audio";

export type WorkerAnswer = {
  wordId: string;
  sentenceId: string;
  correct: boolean;
};

export type WorkerBody = {
  userId?: string;
  sessionKey?: string;
  mode?: QuizMode;
  answers?: WorkerAnswer[];
};

export type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

export type SentenceAggregate = {
  wordId: string;
  sentenceId: string;
  seenInc: number;
  correctInc: number;
  wrongInc: number;
};
