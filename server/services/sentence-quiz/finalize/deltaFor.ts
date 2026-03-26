import { QuizMode } from "./type";

const WRONG_PENALTY = -12;
const STREAK_CAP = 5;

export function deltaFor(
  mode: QuizMode,
  correct: boolean,
  streakBefore: number,
): number {
  if (!correct) return WRONG_PENALTY;

  const effective = Math.min(streakBefore, STREAK_CAP);

  switch (mode) {
    case "level-sentences":
    case "topic-sentences":
    case "level-sentences-audio":
    case "topic-sentences-audio":
      return 10 + effective * 3;
    default:
      return 10 + effective * 3;
  }
}
