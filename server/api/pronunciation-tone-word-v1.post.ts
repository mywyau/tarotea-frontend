import { createError, readMultipartFormData } from "h3"
import { requireUser } from "~/server/utils/requireUser"
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit"
import {
  scoreWordToneAttempt,
  type AcousticSyllableContour,
} from "~/server/utils/whisper/wordToneScoring"

const MAX_AUDIO_SIZE = 1_000_000

function parseAcousticContours(raw: string): AcousticSyllableContour[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object" || !Array.isArray(entry.values)) {
          return null
        }

        const values = entry.values
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isFinite(value) && value > 0)
          .slice(0, 32)

        if (!values.length) return null
        return { values }
      })
      .filter((entry): entry is AcousticSyllableContour => Boolean(entry))
  } catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const userId = auth.sub

  await enforceRateLimit(`rl:pronunciation:tone-word:${userId}`, 10, 60)

  const form = await readMultipartFormData(event)

  const audioFile = form?.find((f) => f.name === "audio")
  const expectedJyutping =
    form?.find((f) => f.name === "expectedJyutping")?.data?.toString().trim() ?? ""
  const pitchSummaryRaw = form?.find((f) => f.name === "pitchSummary")?.data?.toString() ?? ""
  const referenceSummaryRaw = form?.find((f) => f.name === "referenceSummary")?.data?.toString() ?? ""
  const acousticContours = parseAcousticContours(pitchSummaryRaw)
  const referenceContours = parseAcousticContours(referenceSummaryRaw)

  if (!audioFile?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: "Missing audio file" })
  }

  if (!expectedJyutping) {
    throw createError({ statusCode: 400, statusMessage: "Missing expected jyutping" })
  }


  if (audioFile.data.length > MAX_AUDIO_SIZE) {
    throw createError({ statusCode: 400, statusMessage: "Audio file too large" })
  }

  const result = scoreWordToneAttempt({
    expectedJyutping,
    heardJyutping: "",
    acousticContours,
    referenceContours,
    toneOnly: true,
  })

  return {
    heardJyutping: "",
    expectedJyutping,
    soundScore: result.soundScore,
    textToneScore: result.textToneScore,
    acousticToneScore: result.acousticToneScore,
    referenceToneScore: result.referenceToneScore,
    toneScore: result.toneScore,
    overallScore: result.overallScore,
    matchType: result.matchType,
    feedback: result.feedback,
    toneErrors: result.toneErrors,
    expectedTokens: result.expectedTokens,
    heardTokens: result.heardTokens,
    engine: "non-ai-tone-only",
  }
})
