import { createError, readMultipartFormData } from "h3"
import { requireUser } from "~/server/utils/requireUser"
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit"
import {
  scoreWordToneAttempt,
  type AcousticSyllableContour,
} from "~/server/utils/whisper/wordToneScoring"

const MAX_AUDIO_SIZE = 1_000_000
const MIN_RECORDING_DURATION_MS = 350
const MIN_RECORDING_RMS = 0.008
const MIN_RECORDING_PEAK = 0.035

type AudioQualitySummary = {
  durationMs: number
  rms: number
  peak: number
  voicedFrameCount: number
  totalFrameCount: number
}

function parseAudioQuality(raw: string): AudioQualitySummary | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null

    const quality: AudioQualitySummary = {
      durationMs: Number(parsed.durationMs),
      rms: Number(parsed.rms),
      peak: Number(parsed.peak),
      voicedFrameCount: Number(parsed.voicedFrameCount),
      totalFrameCount: Number(parsed.totalFrameCount),
    }

    if (Object.values(quality).some((value) => !Number.isFinite(value) || value < 0)) {
      return null
    }

    return quality
  } catch {
    return null
  }
}

function getAudioQualityError(quality: AudioQualitySummary, expectedTokenCount: number) {
  const minVoicedFrames = Math.max(3, expectedTokenCount * 2)

  if (quality.durationMs < MIN_RECORDING_DURATION_MS) {
    return "Recording is too short"
  }

  if (quality.rms < MIN_RECORDING_RMS || quality.peak < MIN_RECORDING_PEAK || quality.voicedFrameCount < minVoicedFrames) {
    return "Recording does not contain enough clear voice audio"
  }

  return ""
}

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

  await enforceRateLimit(`rl:pronunciation:tone-word:${userId}`, 60, 60)

  const form = await readMultipartFormData(event)

  const audioFile = form?.find((f) => f.name === "audio")
  const expectedJyutping =
    form?.find((f) => f.name === "expectedJyutping")?.data?.toString().trim() ?? ""
  const pitchSummaryRaw = form?.find((f) => f.name === "pitchSummary")?.data?.toString() ?? ""
  const referenceSummaryRaw = form?.find((f) => f.name === "referenceSummary")?.data?.toString() ?? ""
  const audioQualityRaw = form?.find((f) => f.name === "audioQuality")?.data?.toString() ?? ""
  const acousticContours = parseAcousticContours(pitchSummaryRaw)
  const referenceContours = parseAcousticContours(referenceSummaryRaw)
  const audioQuality = parseAudioQuality(audioQualityRaw)

  if (!audioFile?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: "Missing audio file" })
  }

  if (!expectedJyutping) {
    throw createError({ statusCode: 400, statusMessage: "Missing expected jyutping" })
  }


  if (audioFile.data.length > MAX_AUDIO_SIZE) {
    throw createError({ statusCode: 400, statusMessage: "Audio file too large" })
  }

  if (audioQuality) {
    const expectedTokenCount = expectedJyutping.toLowerCase().match(/[a-z]+[1-6]?/g)?.length ?? 0
    const audioQualityError = getAudioQualityError(audioQuality, expectedTokenCount)
    if (audioQualityError) {
      throw createError({ statusCode: 422, statusMessage: audioQualityError })
    }
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
    detectedAcousticTones: result.detectedAcousticTones,
    expectedTokens: result.expectedTokens,
    heardTokens: result.heardTokens,
    engine: "non-ai-tone-only",
  }
})
