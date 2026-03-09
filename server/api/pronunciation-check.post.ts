// import { createError, readMultipartFormData } from "h3";
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export default defineEventHandler(async (event) => {
//   const form = await readMultipartFormData(event);

//   const MAX_AUDIO_SIZE = 1_000_000; // ~1MB

//   const audioFile = form?.find((f) => f.name === "audio");

//   const expectedJyutpingField = form?.find(
//     (f) => f.name === "expectedJyutping",
//   );
//   const expectedChineseField = form?.find((f) => f.name === "expectedChinese");

//   const expectedJyutping = expectedJyutpingField?.data?.toString() ?? "";
//   const expectedChinese = expectedChineseField?.data?.toString() ?? "";

//   const toneLessJyutping = expectedJyutping.replace(/[1-6]/g, "");

//   if (!audioFile || !audioFile.data) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing audio file",
//     });
//   }

//   if (audioFile.data.length > MAX_AUDIO_SIZE) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Audio file too large",
//     });
//   }

//   try {
//     // 1️⃣ Transcribe speech
//     // const transcription = await openai.audio.transcriptions.create({
//     //   file: new File([audioFile.data], "audio.webm"),
//     //   model: "whisper-1",
//     //   language: "yue" // helps Cantonese recognition    -  no iso yue code so rely on luck
//     // });

//     const transcription = await openai.audio.transcriptions.create({
//       file: new File([audioFile.data], "recording.webm", {
//         type: "audio/webm",
//       }),
//       language: "zh",
//       model: "whisper-1",
//       temperature: 0,
//     //   prompt: `Cantonese word: ${expectedChinese}`
//     //   prompt: "Cantonese speech using Jyutping pronunciation please do not try to match Korean or English",
//       prompt: `Cantonese pronunciation such as ${toneLessJyutping}`
//     });

//     const transcript = transcription.text;

//     function normalizeTranscript(text: string) {
//       return text
//         .toLowerCase()
//         .replace(/[^\p{L}\p{N}\s]/gu, "")
//         .trim();
//     }

//     const normalizedTranscript = normalizeTranscript(transcript);

//     if (!transcript) {
//       return {
//         transcript: "",
//         score: 0,
//         feedback: "No speech detected. Please try speaking clearly.",
//       };
//     }

//     console.log("Transcription result:", transcription);
//     console.log("Transcript text:", transcription.text);

//     if (transcript.includes(expectedChinese)) {
//       return {
//         transcript,
//         score: 100,
//         feedback:
//           "Excellent pronunciation. The spoken word matches the expected Cantonese word.",
//       };
//     }

//     // 2️⃣ Ask AI to evaluate pronunciation
//     const completion = await openai.responses.create({
//       model: "gpt-4.1-mini",
//       input: `
// Evaluate a learner's Cantonese pronunciation.

// Expected Chinese:
// ${expectedChinese}

// Expected Jyutping:
// ${expectedJyutping}

// Tone-less Jyutping:
// ${toneLessJyutping}

// Speech transcription:
// ${transcript}

// The transcription may contain English-like words approximating Cantonese sounds.
// Example: "some" may represent "saam".

// Compare the sounds phonetically with the expected Jyutping and score pronunciation from 0–100.

// Guidelines:
// - Compare sounds, not spelling.
// - Minor vowel differences are acceptable.
// - Mostly correct pronunciation should score 80–95.
// - Only give 100 for extremely clear pronunciation.

// Return JSON only:

// {
//   "score": number,
//   "feedback": string
// }

// Feedback should be 1–2 short sentences.
// `,
//     });

//     const resultText = completion.output_text;

//     let result;

//     try {
//       const cleaned = resultText
//         .replace(/```json/g, "")
//         .replace(/```/g, "")
//         .trim();

//       result = JSON.parse(cleaned);
//     } catch {
//       result = {
//         score: 0,
//         feedback: resultText,
//       };
//     }

//     return {
//       transcript,
//       score: result.score,
//       feedback: result.feedback,
//     };
//   } catch (err) {
//     console.error(err);

//     throw createError({
//       statusCode: 500,
//       statusMessage: "Failed to process pronunciation",
//     });
//   }
// });
