export type CharState = "idle" | "base" | "perfect";

export type LiveState = "idle" | "partial" | "pass" | "perfect" | "miss";

export type TypingAttemptLog = {
  input: string;
  passed: boolean;
  message: string;
};

export type TypingAttempt = {
  wordId: string;
  passed: boolean;
  delta: number;
};

export type TypingBatchAttempt = {
  wordId: string;
  passed: boolean;
  hintUsed: boolean;
};

export type TypingTrainWord = {
  wordId: string;
  word: string;
  jyutping: string;
  meaning?: string;
  audioUrl?: string;
};

export type TypingScoreResult = {
  passed: boolean;
  message: string;
};

export type TypingLevelData = {
  level: number;
  title: string;
  description: string;
  categories: Record<
    string,
    {
      id: string;
      word: string;
      jyutping: string;
      meaning: string;
    }[]
  >;
};
