import OpenAI from "openai"
import { readMultipartFormData, createError } from "h3"
import fs from "fs/promises"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default defineEventHandler(async (event) => {

  const form = await readMultipartFormData(event)

  const audioFile = form?.find((f) => f.name === "audio")

  if (!audioFile || !audioFile.data) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing audio file"
    })
  }

  const tempFile = `/tmp/audio-${Date.now()}.webm`

  await fs.writeFile(tempFile, audioFile.data)

  try {

    // 1️⃣ Transcribe speech
    const transcription = await openai.audio.transcriptions.create({
      file: await fs.open(tempFile),
      model: "whisper-1"
    })

    const transcript = transcription.text

    // Example expected pronunciation
    const expected = "hoi1 sam1"

    // 2️⃣ Ask AI to evaluate pronunciation
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
A user is learning Cantonese pronunciation.

Expected Jyutping:
${expected}

User pronunciation transcription:
${transcript}

Give short feedback about pronunciation accuracy.
Mention tone or vowel issues if possible.
`
    })

    return {
      transcript,
      feedback: completion.output_text
    }

  } catch (err) {

    console.error(err)

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to process pronunciation"
    })

  } finally {

    await fs.unlink(tempFile).catch(() => {})

  }

})