export type ToneWordScore = {
  heardJyutping: string
  normalizedExpected: string
  normalizedHeard: string
  expectedTokens: string[]
  heardTokens: string[]
  soundScore: number
  toneScore: number
  overallScore: number
  soundMatches: number
  toneMatches: number
  totalSyllables: number
  matchType: "perfect" | "sound-only" | "close" | "partial" | "wrong"
  feedback: string
  toneErrors: Array<{
    syllable: number
    expected: string
    heard: string
  }>
}

function normalizeJyutping(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/[，。,.;:!?]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenizeJyutping(raw: string): string[] {
  const normalized = normalizeJyutping(raw)
  if (!normalized) return []

  return normalized.match(/[a-z]+[1-6]?/g) ?? []
}

function stripTone(token: string): string {
  return token.replace(/[1-6]/g, "")
}

function getTone(token: string): string {
  const match = token.match(/[1-6]/)
  return match?.[0] ?? ""
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function scoreWordToneAttempt(params: {
  expectedJyutping: string
  heardJyutping: string
}): ToneWordScore {
  const expectedTokens = tokenizeJyutping(params.expectedJyutping)
  const heardTokens = tokenizeJyutping(params.heardJyutping)

  const totalSyllables = expectedTokens.length

  if (!expectedTokens.length) {
    return {
      heardJyutping: params.heardJyutping,
      normalizedExpected: normalizeJyutping(params.expectedJyutping),
      normalizedHeard: normalizeJyutping(params.heardJyutping),
      expectedTokens,
      heardTokens,
      soundScore: 0,
      toneScore: 0,
      overallScore: 0,
      soundMatches: 0,
      toneMatches: 0,
      totalSyllables: 0,
      matchType: "wrong",
      feedback: "No expected jyutping was provided.",
      toneErrors: [],
    }
  }

  let soundMatches = 0
  let toneMatches = 0
  const toneErrors: ToneWordScore["toneErrors"] = []

  for (let i = 0; i < expectedTokens.length; i++) {
    const expected = expectedTokens[i]
    const heard = heardTokens[i] ?? ""

    if (stripTone(expected) === stripTone(heard)) {
      soundMatches += 1

      const expectedTone = getTone(expected)
      const heardTone = getTone(heard)

      if (expectedTone && expectedTone === heardTone) {
        toneMatches += 1
      } else if (expectedTone) {
        toneErrors.push({
          syllable: i + 1,
          expected,
          heard: heard || "(missing)",
        })
      }
    }
  }

  const soundScore = Math.round((soundMatches / totalSyllables) * 100)
  const toneScore = Math.round((toneMatches / totalSyllables) * 100)
  const overallScore = Math.round(clamp(soundScore * 0.7 + toneScore * 0.3, 0, 100))

  const matchType: ToneWordScore["matchType"] =
    soundScore === 100 && toneScore === 100
      ? "perfect"
      : soundScore === 100 && toneScore < 100
        ? "sound-only"
        : overallScore >= 80
          ? "close"
          : overallScore >= 50
            ? "partial"
            : "wrong"

  const feedback =
    matchType === "perfect"
      ? "Perfect — sound and tone both match."
      : matchType === "sound-only"
        ? `Good sound. Tone mismatch on syllable ${toneErrors.map((x) => x.syllable).join(", ")}.`
        : matchType === "close"
          ? "Close. You are mostly right, but there are tone or syllable misses."
          : matchType === "partial"
            ? "Partly correct. Try saying each syllable more clearly with the right tone."
            : "Not quite. Listen again and try matching both the sound and the tone."

  return {
    heardJyutping: params.heardJyutping,
    normalizedExpected: normalizeJyutping(params.expectedJyutping),
    normalizedHeard: normalizeJyutping(params.heardJyutping),
    expectedTokens,
    heardTokens,
    soundScore,
    toneScore,
    overallScore,
    soundMatches,
    toneMatches,
    totalSyllables,
    matchType,
    feedback,
    toneErrors,
  }
}
