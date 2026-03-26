import { Answer } from "./type";

export function buildWordOutcomeMap(
  rawAnswers: Answer[],
): Map<string, boolean> {
  const map = new Map<string, boolean>();

  for (const answer of rawAnswers) {
    if (!answer?.wordId) continue;

    if (!map.has(answer.wordId)) {
      map.set(answer.wordId, !!answer.correct);
    }
  }

  return map;
}
