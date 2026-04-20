import { describe, expect, it } from "vitest"
import { scoreWordToneAttempt } from "../server/utils/whisper/wordToneScoring"

describe("scoreWordToneAttempt", () => {
  it("supports text-based scoring when toneOnly is false", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "nei5",
      heardJyutping: "nei5",
    })

    expect(result.soundScore).toBe(100)
    expect(result.textToneScore).toBe(100)
    expect(result.toneScore).toBe(100)
    expect(result.matchType).toBe("perfect")
  })

  it("uses acoustic score as final score in toneOnly mode", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "si1",
      acousticContours: [{ values: [210, 212, 211, 210] }],
      toneOnly: true,
    })

    expect(result.soundScore).toBe(0)
    expect(result.textToneScore).toBe(0)
    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBe(result.acousticToneScore)
    expect(result.overallScore).toBe(result.toneScore)
  })

  it("returns zero tone score when toneOnly and no contours are provided", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "si1",
      toneOnly: true,
    })

    expect(result.acousticToneScore).toBeNull()
    expect(result.toneScore).toBe(0)
    expect(result.overallScore).toBe(0)
  })

  it("keeps blended tone score in non-toneOnly mode when acoustic contours exist", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "si1",
      heardJyutping: "si1",
      acousticContours: [{ values: [210, 212, 211, 210] }],
    })

    expect(result.textToneScore).toBe(100)
    expect(typeof result.acousticToneScore).toBe("number")
    expect(result.toneScore).toBeGreaterThan(70)
  })
})
