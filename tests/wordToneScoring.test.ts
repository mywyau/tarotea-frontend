import { describe, expect, it } from "vitest"
import { scoreWordToneAttempt } from "../server/utils/whisper/wordToneScoring"

describe("scoreWordToneAttempt", () => {
  it("marks perfect when sounds and tones match", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "nei5",
      heardJyutping: "nei5",
    })

    expect(result.matchType).toBe("perfect")
    expect(result.soundScore).toBe(100)
    expect(result.toneScore).toBe(100)
    expect(result.toneErrors).toHaveLength(0)
  })

  it("marks sound-only when tone differs", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "nei5",
      heardJyutping: "nei2",
    })

    expect(result.matchType).toBe("sound-only")
    expect(result.soundScore).toBe(100)
    expect(result.toneScore).toBe(0)
    expect(result.toneErrors).toHaveLength(1)
  })

  it("penalizes different syllable sound", () => {
    const result = scoreWordToneAttempt({
      expectedJyutping: "nei5",
      heardJyutping: "hou2",
    })

    expect(result.matchType).toBe("wrong")
    expect(result.soundScore).toBe(0)
    expect(result.toneScore).toBe(0)
  })
})
