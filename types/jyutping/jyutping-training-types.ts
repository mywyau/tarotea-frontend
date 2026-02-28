export type CharState = "idle" | "base" | "perfect";

export type LiveState = "idle" | "partial" | "pass" | "perfect" | "miss";

export type AttemptLog = {
  input: string;
  passed: boolean;
  message: string;
};

export type BatchAttempt = {
  wordId: string;
  passed: boolean;
  hintUsed: boolean;
};

export type TrainWord = {
  wordId: string;
  word: string;
  jyutping: string;
  meaning?: string;
  audioUrl?: string;
};

export type ScoreResult = {
  passed: boolean;
  message: string;
};

export type LevelData = {
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
