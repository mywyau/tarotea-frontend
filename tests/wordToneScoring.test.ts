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
    expect(result.toneScore).toBe(Math.min((result.acousticToneScore ?? 0) + 5, 96))
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

  it("keeps single-syllable rising tone words like lei2 from being under-scored", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "lei2",
      acousticContours: [{ values: [158, 159, 160, 161, 162] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThanOrEqual(72)
    expect(result.feedback.toLowerCase()).not.toContain("still off")
  })

  it("does not under-score short contours for keoi5", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "keoi5",
      acousticContours: [{ values: [150, 152, 154] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThan(40)
    expect(result.feedback.toLowerCase()).not.toContain("couldn’t read a stable pitch shape")
  })

  it("provides non-zero grading for very short 2-point contours", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "keoi5",
      acousticContours: [{ values: [150, 152] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThan(15)
    expect(result.toneScore).toBeLessThan(90)
    expect(result.detectedAcousticTones[0]?.detectedTone).toBeTruthy()
  })

  it("avoids perfect 100 for single-syllable tone-only without reference", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "si1",
      acousticContours: [{ values: [210, 210, 210, 210, 210, 210] }],
      toneOnly: true,
    })

    expect(result.referenceToneScore).toBeNull()
    expect(result.toneScore).toBeLessThanOrEqual(96)
  })

  it("returns detected acoustic tones per syllable", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "sai2 sau2",
      acousticContours: [
        { values: [120, 125, 130, 136, 142] },
        { values: [130, 135, 141, 148, 155] },
      ],
      toneOnly: true,
    })

    expect(result.detectedAcousticTones).toHaveLength(2)
    expect(result.detectedAcousticTones[0]?.token).toBe("sai2")
    expect(result.detectedAcousticTones[0]?.detectedTone).toBeTruthy()
  })

  it("is less harsh for level-tone family contours in tone-only mode", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "dei6",
      acousticContours: [{ values: [132, 133, 132, 131, 132] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect((result.acousticToneScore ?? 0)).toBeGreaterThanOrEqual(58)
    expect(result.toneScore).toBeGreaterThan(40)
  })

  it("keeps mixed two-syllable tone-only attempts from collapsing too low when contours are close", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "ngo5 dei6",
      acousticContours: [
        { values: [144, 145, 146, 147, 148] },
        { values: [138, 138, 137, 137, 136] },
      ],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThan(45)
  })

  it("keeps single tone-3 attempts more stable when contour is almost level", () => {
    const mildDrift = scoreWordToneAttempt({
      expectedJyutping: "aa3",
      acousticContours: [{ values: [10.1, 10.0, 10.2, 10.1, 10.0, 10.1] }],
      toneOnly: true,
    })

    const flatter = scoreWordToneAttempt({
      expectedJyutping: "aa3",
      acousticContours: [{ values: [10.0, 10.0, 10.1, 10.0, 10.0, 10.0] }],
      toneOnly: true,
    })

    expect(mildDrift.acousticToneScore).not.toBeNull()
    expect(flatter.acousticToneScore).not.toBeNull()
    expect(Math.abs((mildDrift.acousticToneScore ?? 0) - (flatter.acousticToneScore ?? 0))).toBeLessThanOrEqual(6)
  })

  it("uses more reference influence for single-syllable tone-only words", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "aa3",
      acousticContours: [{ values: [10.4, 10.3, 10.4, 10.3, 10.3, 10.4] }],
      referenceContours: [{ values: [10.2, 10.2, 10.2, 10.2, 10.2, 10.2] }],
      toneOnly: true,
    })

    expect(result.acousticToneScore).not.toBeNull()
    expect(result.referenceToneScore).not.toBeNull()
    expect(result.toneScore).toBeGreaterThanOrEqual(70)
  })

})
