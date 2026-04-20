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
  referenceToneScore: number | null
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
  if (values.length < 4) return null

  const start = values[0]
  const end = values[values.length - 1]
  const mean = safeMean(values)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const slope = (end - start) / Math.max(start, 1)
  const range = (max - min) / Math.max(mean, 1)

  const boundedSlope = clamp(slope, -0.4, 0.4)
  const boundedRange = clamp(range, 0, 0.6)

  if (tone === "1") return clamp(95 - Math.abs(boundedSlope) * 180 - boundedRange * 50, 0, 100)
  if (tone === "2") return clamp(50 + boundedSlope * 170 - Math.abs(boundedRange - 0.16) * 70, 0, 100)
  if (tone === "3") return clamp(92 - Math.abs(boundedSlope) * 170 - boundedRange * 45, 0, 100)
  if (tone === "4") return clamp(50 + (-boundedSlope) * 180 - Math.abs(boundedRange - 0.18) * 70, 0, 100)
  if (tone === "5") return clamp(55 + boundedSlope * 165 - Math.abs(boundedRange - 0.1) * 65, 0, 100)
  if (tone === "6") return clamp(90 - Math.abs(boundedSlope) * 180 - boundedRange * 45, 0, 100)

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

function resample(values: number[], targetLength = 24) {
  if (!values.length) return []
  if (values.length === targetLength) return values

  const out: number[] = []

  for (let i = 0; i < targetLength; i++) {
    const t = (i * (values.length - 1)) / Math.max(targetLength - 1, 1)
    const left = Math.floor(t)
    const right = Math.min(values.length - 1, left + 1)
    const alpha = t - left
    out.push(values[left] * (1 - alpha) + values[right] * alpha)
  }

  return out
}

function zNormalize(values: number[]) {
  if (!values.length) return []
  const mean = safeMean(values)
  const variance = safeMean(values.map((v) => (v - mean) ** 2))
  const std = Math.sqrt(variance) || 1
  return values.map((v) => (v - mean) / std)
}

function scoreReferenceSimilarity(
  userContours: AcousticSyllableContour[],
  referenceContours: AcousticSyllableContour[],
) {
  if (!userContours.length || !referenceContours.length) return null

  const maxLen = Math.min(userContours.length, referenceContours.length)
  const scores: number[] = []

  for (let i = 0; i < maxLen; i++) {
    const u = userContours[i]?.values ?? []
    const r = referenceContours[i]?.values ?? []

    if (u.length < 4 || r.length < 4) continue

    const uNorm = zNormalize(resample(u))
    const rNorm = zNormalize(resample(r))

    const mad = safeMean(uNorm.map((value, idx) => Math.abs(value - rNorm[idx])))
    const slopeUser = uNorm[uNorm.length - 1] - uNorm[0]
    const slopeRef = rNorm[rNorm.length - 1] - rNorm[0]
    const slopePenalty = Math.abs(slopeUser - slopeRef)

    const score = clamp(100 - mad * 32 - slopePenalty * 18, 0, 100)
    scores.push(score)
  }

  if (!scores.length) return null
  return Math.round(safeMean(scores))
}

export function scoreWordToneAttempt(params: {
  expectedJyutping: string
  heardJyutping?: string
  acousticContours?: AcousticSyllableContour[]
  referenceContours?: AcousticSyllableContour[]
  toneOnly?: boolean
}): ToneWordScore {
  const expectedTokens = tokenizeJyutping(params.expectedJyutping)
  const heardTokens = tokenizeJyutping(params.heardJyutping ?? "")

  const totalSyllables = expectedTokens.length

  if (!expectedTokens.length) {
    return {
      heardJyutping: params.heardJyutping ?? "",
      normalizedExpected: normalizeJyutping(params.expectedJyutping),
      normalizedHeard: normalizeJyutping(params.heardJyutping ?? ""),
      expectedTokens,
      heardTokens,
      soundScore: 0,
      toneScore: 0,
      textToneScore: 0,
      acousticToneScore: null,
      referenceToneScore: null,
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
      } else if (expectedTone && heard) {
        toneErrors.push({
          syllable: i + 1,
          expected,
          heard,
        })
      }
    }
  }

  const soundScore = Math.round((soundMatches / totalSyllables) * 100)
  const textToneScore = Math.round((toneMatches / totalSyllables) * 100)
  const acousticToneScore = scoreAcousticTones(expectedTokens, params.acousticContours ?? [])
  const referenceToneScore = scoreReferenceSimilarity(
    params.acousticContours ?? [],
    params.referenceContours ?? [],
  )

  const toneOnly = Boolean(params.toneOnly)

  const fusedAcoustic =
    referenceToneScore === null
      ? acousticToneScore
      : acousticToneScore === null
        ? referenceToneScore
        : Math.round((acousticToneScore * 0.45) + (referenceToneScore * 0.55))

  const toneScore = toneOnly
    ? fusedAcoustic ?? 0
    : fusedAcoustic === null
      ? textToneScore
      : Math.round(clamp(textToneScore * 0.5 + fusedAcoustic * 0.5, 0, 100))

  const overallScore = toneOnly
    ? toneScore
    : Math.round(clamp(soundScore * 0.7 + toneScore * 0.3, 0, 100))

  const matchType: ToneWordScore["matchType"] =
    overallScore === 100
      ? "perfect"
      : overallScore >= 80
        ? "close"
        : overallScore >= 50
          ? "partial"
          : "wrong"

  const feedback = toneOnly
    ? fusedAcoustic === null
      ? "Could not detect a stable pitch contour. Try speaking a little longer in a quiet room."
      : referenceToneScore !== null && referenceToneScore < 55
        ? "Your pitch contour differs from the native reference. Try matching the shape of the sample audio."
        : overallScore >= 85
          ? "Great tone contour match."
          : overallScore >= 60
            ? "Tone contour is close. Try to keep the shape more consistent."
            : "Tone contour does not match well yet. Try again and focus on pitch shape."
    : matchType === "perfect"
      ? "Perfect — sound and tone both match."
      : soundScore === 100 && toneScore < 100
        ? `Good sound. Tone mismatch on syllable ${toneErrors.map((x) => x.syllable).join(", ")}.`
        : matchType === "close"
          ? "Close. You are mostly right, but there are tone or syllable misses."
          : matchType === "partial"
            ? "Partly correct. Try saying each syllable more clearly with the right tone."
            : "Not quite. Listen again and try matching both the sound and the tone."

  return {
    heardJyutping: params.heardJyutping ?? "",
    normalizedExpected: normalizeJyutping(params.expectedJyutping),
    normalizedHeard: normalizeJyutping(params.heardJyutping ?? ""),
    expectedTokens,
    heardTokens,
    soundScore,
    toneScore,
    textToneScore,
    acousticToneScore,
    referenceToneScore,
    overallScore,
    soundMatches,
    toneMatches,
    totalSyllables,
    matchType,
    feedback,
    toneErrors,
  }
}
