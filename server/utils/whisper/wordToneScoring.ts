export type AcousticSyllableContour = {
  values: number[]
}

export type ToneWordScore = {
  heardJyutping: string
  normalizedExpected: string
  normalizedHeard: string
  expectedTokens: string[]
  heardTokens: string[]
  soundScore: number
  toneScore: number
  textToneScore: number
  acousticToneScore: number | null
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

function safeMean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function scoreContourForTone(tone: string, contour: AcousticSyllableContour | undefined) {
  if (!contour?.values?.length) return null

  const values = contour.values.filter((v) => Number.isFinite(v) && v > 0)
  if (!values.length) return null

  const start = values[0]
  const end = values[values.length - 1]
  const mean = safeMean(values)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const slope = (end - start) / Math.max(start, 1)
  const range = (max - min) / Math.max(mean, 1)

  // Coarse Cantonese tone contour heuristics:
  // 1 high level, 2 high rising, 3 mid level, 4 low falling, 5 low rising, 6 low level
  if (tone === "1") return clamp(100 - Math.abs(slope) * 260 - Math.abs(range - 0.12) * 140, 0, 100)
  if (tone === "2") return clamp(40 + slope * 240 - Math.abs(range - 0.22) * 120, 0, 100)
  if (tone === "3") return clamp(100 - Math.abs(slope) * 220 - Math.abs(range - 0.1) * 140, 0, 100)
  if (tone === "4") return clamp(40 + (-slope) * 260 - Math.abs(range - 0.25) * 120, 0, 100)
  if (tone === "5") return clamp(40 + slope * 220 - Math.abs(range - 0.2) * 110, 0, 100)
  if (tone === "6") return clamp(100 - Math.abs(slope) * 240 - Math.abs(range - 0.08) * 150, 0, 100)

  return null
}

function scoreAcousticTones(expectedTokens: string[], contours: AcousticSyllableContour[]) {
  if (!contours.length || !expectedTokens.length) return null

  const syllableScores: number[] = []

  for (let i = 0; i < expectedTokens.length; i++) {
    const tone = getTone(expectedTokens[i])
    const contourScore = scoreContourForTone(tone, contours[i])

    if (typeof contourScore === "number") {
      syllableScores.push(contourScore)
    }
  }

  if (!syllableScores.length) return null
  return Math.round(safeMean(syllableScores))
}

export function scoreWordToneAttempt(params: {
  expectedJyutping: string
  heardJyutping: string
  acousticContours?: AcousticSyllableContour[]
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
      textToneScore: 0,
      acousticToneScore: null,
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
  const textToneScore = Math.round((toneMatches / totalSyllables) * 100)
  const acousticToneScore = scoreAcousticTones(expectedTokens, params.acousticContours ?? [])
  const toneScore =
    acousticToneScore === null
      ? textToneScore
      : Math.round(clamp(textToneScore * 0.5 + acousticToneScore * 0.5, 0, 100))

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
    textToneScore,
    acousticToneScore,
    overallScore,
    soundMatches,
    toneMatches,
    totalSyllables,
    matchType,
    feedback,
    toneErrors,
  }
}
