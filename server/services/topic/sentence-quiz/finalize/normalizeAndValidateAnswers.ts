import { Answer } from "./type";

export function normalizeAndValidateAnswers(
  answers: unknown,
  allowedPairs: Set<string>,
): Answer[] {
  if (!Array.isArray(answers)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid answers payload",
    });
  }

  const normalized: Answer[] = [];
  const seenPairs = new Set<string>();

  for (const raw of answers) {
    const wordId =
      typeof raw?.wordId === "string" ? raw.wordId.trim() : "";
    const sentenceId =
      typeof raw?.sentenceId === "string" ? raw.sentenceId.trim() : "";
    const correct =
      typeof raw?.correct === "boolean" ? raw.correct : null;

    if (!wordId || !sentenceId || correct === null) {
      throw createError({
        statusCode: 400,
        statusMessage: "Malformed answer payload",
      });
    }

    const pairKey = `${wordId}:${sentenceId}`;

    if (!allowedPairs.has(pairKey)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Answer does not belong to this quiz session",
      });
    }

    if (seenPairs.has(pairKey)) {
      continue;
    }

    seenPairs.add(pairKey);
    normalized.push({
      wordId,
      sentenceId,
      correct,
    });
  }

  return normalized;
}