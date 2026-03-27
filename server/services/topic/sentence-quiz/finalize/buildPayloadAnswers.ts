import { buildWordOutcomeMap } from "./buildWordOutcomeMap";
import { deltaFor } from "./deltaFor";
import { Answer, PayloadAnswer, QuizMode } from "./type";

export function buildPayloadAnswers(
  mode: QuizMode,
  rawAnswers: Answer[],
  streakMap: Map<string, number>,
): PayloadAnswer[] {
  const wordOutcomeMap = buildWordOutcomeMap(rawAnswers);

  return [...wordOutcomeMap.entries()].map(([wordId, correct]) => {
    const streakBefore = streakMap.get(wordId) ?? 0;

    return {
      wordId,
      correct,
      delta: deltaFor(mode, correct, streakBefore),
    };
  });
}
