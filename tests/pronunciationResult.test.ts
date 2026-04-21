import { describe, expect, it } from "vitest";
import { buildResult } from "../server/utils/whisper/helpers";

describe("buildResult", () => {
  it("accepts correct jyutping romanization for single words", () => {
    const result = buildResult({
      expectedChinese: "住",
      expectedJyutping: "zyu6",
      transcript: "zyu6",
      avgLogprob: -0.3,
    });

    expect(result.matchType).toBe("romanized-match");
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("is less harsh for single-character homophone-like misses", () => {
    const result = buildResult({
      expectedChinese: "坐",
      expectedJyutping: "co5",
      transcript: "做",
      avgLogprob: -0.3,
    });

    expect(result.matchType).toBe("single-char-homophone");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });
});
