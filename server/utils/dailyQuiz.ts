export const DAILY_MODE = "daily_meaning_quiz";
export const DAILY_REQUIRED_WORDS = 100;
export const DAILY_QUESTION_COUNT = 20;
export const DAILY_DISTRACTOR_COUNT = 3;
export const STREAK_CAP = 5;

export type DailyAnswer = {
  wordId: string;
  correct: boolean;
};

export type DailyQuestionOption = {
  id: string;
  word: string;
  meaning: string;
};

export type DailyQuestion = {
  id: string;
  word: string;
  meaning: string;
  options: DailyQuestionOption[];
  progress: {
    xp: number;
    streak: number;
  };
};

export function getUtcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function buildDailySessionKey(
  mode: string,
  sessionDate: string,
  userId: string,
): string {
  return `daily:${mode}:${sessionDate}:${userId}`;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function dedupeAnswers(raw: unknown): DailyAnswer[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: DailyAnswer[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const wordId = (item as DailyAnswer).wordId;
    const correct = (item as DailyAnswer).correct;

    if (typeof wordId !== "string" || !wordId.trim()) continue;
    if (typeof correct !== "boolean") continue;
    if (seen.has(wordId)) continue;

    seen.add(wordId);
    result.push({ wordId, correct });
  }

  return result;
}

export function dailyDeltaFor(correct: boolean, streakBefore: number): number {
  if (!correct) return 0;
  const effective = Math.min(streakBefore, STREAK_CAP);
  return 5 + effective * 2;
}