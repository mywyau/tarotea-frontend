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
    expect(result.toneScore).toBe(Math.min((result.acousticToneScore ?? 0) + 5, 100))
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

  it("is more tolerant for multi-syllable words by trimming worst syllable", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "sai2 sau2 gaan1",
      acousticContours: [
        { values: [170, 175, 181, 188, 193] },
        { values: [165, 169, 172, 177, 182] },
        { values: [210, 160, 140, 130, 120] },
      ],
      referenceContours: [
        { values: [168, 174, 180, 186, 192] },
        { values: [163, 168, 171, 176, 181] },
        { values: [160, 162, 164, 166, 168] },
      ],
      toneOnly: true,
    })

    expect(result.toneScore).toBeGreaterThan(45)
  })

  it("leans more on acoustic tone score than reference for tone-only scoring", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "sai2 sau2 gaan1",
      acousticContours: [
        { values: [160, 165, 170, 176, 182] },
        { values: [162, 167, 171, 176, 181] },
        { values: [190, 191, 192, 193, 194] },
      ],
      referenceContours: [
        { values: [220, 200, 180, 160, 140] },
        { values: [220, 200, 180, 160, 140] },
        { values: [220, 200, 180, 160, 140] },
      ],
      toneOnly: true,
    })

    expect((result.acousticToneScore ?? 0)).toBeGreaterThan((result.referenceToneScore ?? 0))
    expect(result.toneScore).toBeGreaterThan(60)
  })

  it("handles slower/faster contour timing via DTW reference matching", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "sai2",
      acousticContours: [{ values: [120, 125, 131, 138, 146, 154, 163] }],
      referenceContours: [{ values: [120, 123, 126, 131, 138, 146, 154, 163, 170, 176] }],
      toneOnly: true,
    })

    expect(result.referenceToneScore).not.toBeNull()
    expect((result.referenceToneScore ?? 0)).toBeGreaterThan(60)
  })

  it("applies a small generosity boost for tone-only single syllables", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "sai2",
      acousticContours: [{ values: [140, 145, 150, 155, 161] }],
      toneOnly: true,
    })

    expect(result.toneScore).toBeGreaterThan(60)
  })

  it("explains likely tone issues in a human-friendly way", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "sai2",
      acousticContours: [{ values: [180, 172, 165, 159, 152] }],
      toneOnly: true,
    })

    expect(result.feedback).toContain("Syllable 1")
    expect(result.feedback).toContain("should rise")
  })

  it("is more generous for single-syllable rising tone words like caang2", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "caang2",
      acousticContours: [{ values: [140, 143, 146, 149, 152] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThanOrEqual(75)
    expect(result.feedback.toLowerCase()).not.toContain("still off")
  })

})
