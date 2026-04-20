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
  it("does not collapse to zero for a mild rising tone-5 contour", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "nei5",
      acousticContours: [{ values: [155, 156, 157, 158, 159, 160] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThan(0)
  })

  it("boosts tone-only scoring when user contour matches reference contour", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "nei5",
      acousticContours: [{ values: [150, 152, 155, 157, 160] }],
      referenceContours: [{ values: [149, 151, 154, 158, 161] }],
      toneOnly: true,
    })

    expect(result.referenceToneScore).not.toBeNull()
    expect((result.referenceToneScore ?? 0)).toBeGreaterThan(70)
    expect(result.toneScore).toBeGreaterThan(60)
  })

})
