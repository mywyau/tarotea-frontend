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
  if (values.length < 3) return null

  const start = values[0]
  const end = values[values.length - 1]
  const mean = safeMean(values)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const slope = (end - start) / Math.max(start, 1)
  const range = (max - min) / Math.max(mean, 1)

  const boundedSlope = clamp(slope, -0.4, 0.4)
  const boundedRange = clamp(range, 0, 0.6)

  if (tone === "1") return clamp(97 - Math.abs(boundedSlope) * 150 - boundedRange * 40, 0, 100)
  if (tone === "2") return clamp(62 + boundedSlope * 175 - Math.abs(boundedRange - 0.14) * 45, 0, 100)
  if (tone === "3") return clamp(94 - Math.abs(boundedSlope) * 145 - boundedRange * 35, 0, 100)
  if (tone === "4") return clamp(56 + (-boundedSlope) * 180 - Math.abs(boundedRange - 0.18) * 55, 0, 100)
  if (tone === "5") return clamp(60 + boundedSlope * 165 - Math.abs(boundedRange - 0.1) * 55, 0, 100)
  if (tone === "6") return clamp(92 - Math.abs(boundedSlope) * 150 - boundedRange * 35, 0, 100)

  return null
}

function aggregateSyllableScores(scores: number[], totalSyllables: number) {
  if (!scores.length) return null

  if (totalSyllables >= 3 && scores.length >= 3) {
    const sorted = [...scores].sort((a, b) => a - b)
    const trimmed = sorted.slice(1)
    return Math.round(safeMean(trimmed))
  }

  return Math.round(safeMean(scores))
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
  return aggregateSyllableScores(syllableScores, expectedTokens.length)
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

function dtwDistance(a: number[], b: number[]) {
  const n = a.length
  const m = b.length

  if (!n || !m) return Number.POSITIVE_INFINITY

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(Number.POSITIVE_INFINITY),
  )
  dp[0][0] = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1])
      dp[i][j] =
        cost +
        Math.min(
          dp[i - 1][j], // insertion
          dp[i][j - 1], // deletion
          dp[i - 1][j - 1], // match
        )
    }
  }

  return dp[n][m] / (n + m)
}

function scoreReferenceSimilarity(
  userContours: AcousticSyllableContour[],
  referenceContours: AcousticSyllableContour[],
  totalSyllables: number,
) {
  if (!userContours.length || !referenceContours.length) return null

  const maxLen = Math.min(userContours.length, referenceContours.length)
  const scores: number[] = []

  for (let i = 0; i < maxLen; i++) {
    const u = userContours[i]?.values ?? []
    if (u.length < 4) continue

    const candidates = [referenceContours[i - 1], referenceContours[i], referenceContours[i + 1]]
      .filter(Boolean)
      .map((contour) => contour?.values ?? [])
      .filter((values) => values.length >= 4)

    if (!candidates.length) continue

    const uNorm = zNormalize(resample(u))

    const best = Math.max(
      ...candidates.map((candidate) => {
        const rNorm = zNormalize(resample(candidate))
        const mad = safeMean(uNorm.map((value, idx) => Math.abs(value - rNorm[idx])))
        const dtw = dtwDistance(uNorm, rNorm)
        const slopeUser = uNorm[uNorm.length - 1] - uNorm[0]
        const slopeRef = rNorm[rNorm.length - 1] - rNorm[0]
        const slopePenalty = Math.abs(slopeUser - slopeRef)

        return clamp(100 - mad * 12 - dtw * 28 - slopePenalty * 10, 0, 100)
      }),
    )

    scores.push(best)
  }

  return aggregateSyllableScores(scores, totalSyllables)
}

function describeExpectedTone(tone: string) {
  if (tone === "1") return "high and level"
  if (tone === "2") return "rising"
  if (tone === "3") return "mid and level"
  if (tone === "4") return "falling"
  if (tone === "5") return "low rising"
  if (tone === "6") return "low and level"
  return "stable"
}

function summarizeContourShape(contour: AcousticSyllableContour | undefined) {
  const values = (contour?.values ?? []).filter((v) => Number.isFinite(v) && v > 0)
  if (values.length < 3) return null

  const start = values[0]
  const end = values[values.length - 1]
  const mean = safeMean(values)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const slope = (end - start) / Math.max(start, 1)
  const range = (max - min) / Math.max(mean, 1)

  let direction: "rising" | "falling" | "level" = "level"
  if (slope > 0.08) direction = "rising"
  else if (slope < -0.08) direction = "falling"

  let movement: "flat" | "moderate" | "wide" = "moderate"
  if (range < 0.08) movement = "flat"
  else if (range > 0.28) movement = "wide"

  return { direction, movement }
}

function explainToneIssue(
  token: string,
  contour: AcousticSyllableContour | undefined,
): string | null {
  const tone = getTone(token)
  const expected = describeExpectedTone(tone)
  const shape = summarizeContourShape(contour)
  if (!tone || !shape) return null

  if (tone === "2" || tone === "5") {
    if (shape.direction === "falling") {
      return `should rise (${expected}), but your pitch fell`
    }
    if (shape.direction === "level" || shape.movement === "flat") {
      return `should rise (${expected}), but your pitch stayed too flat`
    }
    return null
  }

  if (tone === "4") {
    if (shape.direction === "rising") return `should fall (${expected}), but your pitch rose`
    if (shape.direction === "level" || shape.movement === "flat") {
      return `should fall (${expected}), but your pitch stayed too flat`
    }
    return null
  }

  if (tone === "1" || tone === "3" || tone === "6") {
    if (shape.direction !== "level") {
      return `should stay ${expected}, but your pitch moved ${shape.direction}`
    }
    if (shape.movement === "wide") {
      return `should stay ${expected}, but there was too much pitch swing`
    }
    return null
  }

  return null
}

function buildSingleWordToneBoost(params: {
  toneOnly: boolean
  expectedTokens: string[]
  acousticContours?: AcousticSyllableContour[]
  toneScoreBase: number
}) {
  if (!params.toneOnly || params.expectedTokens.length !== 1 || params.toneScoreBase <= 0) {
    return 0
  }

  const token = params.expectedTokens[0]
  const tone = getTone(token)
  const shape = summarizeContourShape((params.acousticContours ?? [])[0])

  // Default small kindness boost for one-syllable tone-only words.
  let boost = 5

  // Extra help for rising tones (tone 2/5) when the contour is at least not falling.
  if ((tone === "2" || tone === "5") && shape && shape.direction !== "falling") {
    boost += 3
  }

  // If there is no contour summary, stay conservative.
  if (!shape) {
    boost = 4
  }

  return boost
}

function applySingleWordToneFloor(params: {
  toneOnly: boolean
  expectedTokens: string[]
  acousticContours?: AcousticSyllableContour[]
  toneScore: number
}) {
  if (!params.toneOnly || params.expectedTokens.length !== 1) {
    return params.toneScore
  }

  const token = params.expectedTokens[0]
  const tone = getTone(token)
  const shape = summarizeContourShape((params.acousticContours ?? [])[0])

  if ((tone === "2" || tone === "5") && shape && shape.direction !== "falling") {
    // Single rising tones like lei2/caang2 can be naturally subtle.
    return Math.max(params.toneScore, 72)
  }

  return params.toneScore
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
    expectedTokens.length,
  )

  const toneOnly = Boolean(params.toneOnly)

  const fusedAcoustic =
    referenceToneScore === null
      ? acousticToneScore
      : acousticToneScore === null
        ? referenceToneScore
        : Math.round((acousticToneScore * 0.75) + (referenceToneScore * 0.25))

  const toneScoreBase = toneOnly
    ? fusedAcoustic ?? 0
    : fusedAcoustic === null
      ? textToneScore
      : Math.round(clamp(textToneScore * 0.5 + fusedAcoustic * 0.5, 0, 100))

  const toneScoreRaw =
    toneOnly && expectedTokens.length >= 3 && toneScoreBase > 0
      ? Math.round(
          clamp(
            toneScoreBase + 8 + ((acousticToneScore ?? 0) >= 70 ? 7 : 0),
            0,
            100,
          ),
        )
      : toneOnly && toneScoreBase > 0
        ? Math.round(
            clamp(
              toneScoreBase +
                buildSingleWordToneBoost({
                  toneOnly,
                  expectedTokens,
                  acousticContours: params.acousticContours,
                  toneScoreBase,
                }),
              0,
              100,
            ),
          )
        : toneScoreBase

  const toneScore = applySingleWordToneFloor({
    toneOnly,
    expectedTokens,
    acousticContours: params.acousticContours,
    toneScore: toneScoreRaw,
  })

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

  const toneIssueDetails = toneOnly
    ? expectedTokens
        .map((token, idx) => {
          const issue = explainToneIssue(token, (params.acousticContours ?? [])[idx])
          if (!issue) return null
          return `Syllable ${idx + 1} (${token}): ${issue}.`
        })
        .filter((issue): issue is string => Boolean(issue))
        .slice(0, 2)
    : []

  const feedback = toneOnly
    ? fusedAcoustic === null
      ? "I couldn’t read a stable pitch shape yet. Try saying the word a little longer in a quieter place."
      : overallScore >= 88
        ? "Great job — your tone shape is very close to the target."
        : overallScore >= 70
          ? toneIssueDetails.length
            ? `Nice attempt — you’re close. ${toneIssueDetails.join(" ")}`
            : "Nice attempt — you’re close. Keep your pitch movement a little steadier."
          : toneIssueDetails.length
            ? `Good effort. ${toneIssueDetails.join(" ")} Try again slowly and copy the sample rhythm.`
            : "Good effort. Your tone shape is still off. Try again slowly and copy the sample rhythm."
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
