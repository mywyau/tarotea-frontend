import { createError, readMultipartFormData } from "h3";
import OpenAI from "openai";
import { consumeWhisperAttemptMonthly } from "../utils/whisper/consumeWhisperAttemptMonthly";
import { recordWhisperAttempt } from "../utils/whisper/recordWhisperAttempt";
import { requirePaidUser } from "../utils/whisper/requirePaidUser";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default defineEventHandler(async (event) => {

  const userId = await requireUser(event);
  await requirePaidUser(userId); // 🔒 block free users

  console.log("[pronunciation-check.post]")

  const form = await readMultipartFormData(event);

  const MAX_AUDIO_SIZE = 1_000_000; // ~1MB

  const audioFile = form?.find((f) => f.name === "audio");

  const expectedJyutpingField = form?.find(
    (f) => f.name === "expectedJyutping",
  );
  const expectedChineseField = form?.find((f) => f.name === "expectedChinese");

  const expectedJyutping = expectedJyutpingField?.data?.toString() ?? "";
  const expectedChinese = expectedChineseField?.data?.toString() ?? "";

  const toneLessJyutping = expectedJyutping.replace(/[1-6]/g, "");

  if (!expectedChinese || !expectedJyutping) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing pronunciation/chinese word metadata",
    });
  }

  if (!audioFile || !audioFile.data) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing audio file",
    });
  }

  if (audioFile.data.length > MAX_AUDIO_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: "Audio file too large",
    });
  }

  const { attempts, remaining } = await consumeWhisperAttemptMonthly(userId);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile.data], "recording.webm", {
        type: "audio/webm",
      }),
      language: "zh",
      model: "whisper-1",
      temperature: 0,
      prompt: `Cantonese speech. Possible word: ${expectedChinese}. Return what you hear. Do not accept Mandarin only Cantonese`,
    });

    const transcript = transcription.text;

    await recordWhisperAttempt(userId);

    if (!transcript) {
      return {
        transcript: "",
        score: 0,
        feedback: "No speech detected. Please try speaking clearly.",
      };
    }

    console.log("[pronunciation-check.post] called");
    if (process.env.NODE_ENV !== "production") {
      console.log("Transcription result:", transcription);
    }
    // console.log("Transcript text:", transcription.text);

    // if (transcript.includes(expectedChinese)) {
    //   return {
    //     transcript,
    //     score: 100,
    //     feedback:
    //       "Excellent pronunciation. What you said matches the chinese word returned.",
    //   };
    // }

    // 2️⃣ Ask AI to evaluate pronunciation
    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Evaluate a learner's Cantonese pronunciation.

Expected word:
${expectedChinese} (${expectedJyutping})

Speech transcription from Whisper:
${transcript}

Scoring rules:
- If the transcription matches the expected word exactly → score between 90 to 100
- If the word is similar but slightly different → score between 60 to 85
- If pronunciation sounds very different → score between 0 to 50

Return JSON only:

{
  "score": number,
  "feedback": string
}

Feedback should explain differences in pronunciation if any. Keep it light and simple.
`,
    });

    const resultText = completion.output_text;

    let result;

    try {
      const cleaned = resultText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      result = JSON.parse(cleaned);
    } catch {
      result = {
        score: 0,
        feedback: resultText,
      };
    }

    return {
      transcript,
      score: result.score,
      feedback: result.feedback,
      remainingAttempts: remaining,
    };
  } catch (err) {
    console.error(err);

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to process pronunciation",
    });
  }
});
