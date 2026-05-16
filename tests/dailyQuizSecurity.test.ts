import { describe, expect, it } from "vitest";
import {
  dedupeAnswers,
  isDailyAnswerCorrect,
  normalizeDailyAnswerText,
} from "../server/utils/dailyQuiz";

describe("daily vocab answer validation helpers", () => {
  it("requires a submitted answer instead of accepting a bare client correctness flag", () => {
    expect(
      dedupeAnswers([
        { wordId: "word-1", correct: true },
        { wordId: "word-2", answer: "tea", correct: true },
      ]),
    ).toEqual([{ wordId: "word-2", answer: "tea", correct: true }]);
  });

  it("keeps the first answer per word and trims submitted text", () => {
    expect(
      dedupeAnswers([
        { wordId: " word-1 ", answer: "  tea  ", correct: false },
        { wordId: "word-1", answer: "coffee", correct: true },
      ]),
    ).toEqual([{ wordId: "word-1", answer: "tea", correct: false }]);
  });

  it("normalizes incidental whitespace before comparing answer text", () => {
    expect(normalizeDailyAnswerText("  milk   tea  ")).toBe("milk tea");
    expect(isDailyAnswerCorrect(" milk   tea ", "milk tea")).toBe(true);
    expect(isDailyAnswerCorrect("coffee", "milk tea")).toBe(false);
  });
});
