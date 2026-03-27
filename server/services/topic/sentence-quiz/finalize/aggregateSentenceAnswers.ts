import { Answer, SentenceAggregate } from "./type";

export function aggregateSentenceAnswers(
  answers: Answer[],
): SentenceAggregate[] {
  const map = new Map<string, SentenceAggregate>();

  for (const a of answers) {
    const existing = map.get(a.sentenceId) ?? {
      wordId: a.wordId,
      sentenceId: a.sentenceId,
      seenInc: 0,
      correctInc: 0,
      wrongInc: 0,
    };

    existing.seenInc += 1;

    if (a.correct) {
      existing.correctInc += 1;
    } else {
      existing.wrongInc += 1;
    }

    map.set(a.sentenceId, existing);
  }

  return [...map.values()];
}
