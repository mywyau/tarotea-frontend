import { createError, readMultipartFormData } from "h3"
import OpenAI from "openai"
import { requireUser } from "~/server/utils/requireUser"
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit"
import { scoreWordToneAttempt } from "~/server/utils/whisper/wordToneScoring"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_AUDIO_SIZE = 1_000_000

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const userId = auth.sub

  await enforceRateLimit(`rl:pronunciation:tone-word:${userId}`, 10, 60)

  const form = await readMultipartFormData(event)

  const audioFile = form?.find((f) => f.name === "audio")
  const expectedJyutping =
    form?.find((f) => f.name === "expectedJyutping")?.data?.toString().trim() ?? ""

  if (!audioFile?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: "Missing audio file" })
  }

  if (!expectedJyutping) {
    throw createError({ statusCode: 400, statusMessage: "Missing expected jyutping" })
  }

  if (audioFile.data.length > MAX_AUDIO_SIZE) {
    throw createError({ statusCode: 400, statusMessage: "Audio file too large" })
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile.data], "recording.webm", {
        type: audioFile.type || "audio/webm",
      }),
      model: "gpt-4o-mini-transcribe",
      language: "zh",
      temperature: 0,
      response_format: "json",
      prompt: `You are transcribing a Cantonese single word. Return jyutping with tone numbers only, lowercase, no punctuation. Example: nei5 hou2`,
    })

    const heardJyutping = (transcription.text ?? "").trim().toLowerCase()
    const result = scoreWordToneAttempt({
      expectedJyutping,
      heardJyutping,
    })

    return {
      heardJyutping,
      expectedJyutping,
      soundScore: result.soundScore,
      toneScore: result.toneScore,
      overallScore: result.overallScore,
      matchType: result.matchType,
      feedback: result.feedback,
      toneErrors: result.toneErrors,
      expectedTokens: result.expectedTokens,
      heardTokens: result.heardTokens,
    }
  } catch (err: any) {
    console.error("[pronunciation-tone-word-v1]", err)

    throw createError({
      statusCode: err?.statusCode ?? 500,
      statusMessage: err?.statusMessage ?? "Failed to process tone check",
    })
  }
})
