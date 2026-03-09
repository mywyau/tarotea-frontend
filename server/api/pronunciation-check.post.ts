// import { createError, readMultipartFormData } from "h3";
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export default defineEventHandler(async (event) => {


//   const form = await readMultipartFormData(event);

//   const audioFile = form?.find((f) => f.name === "audio");
//   const expectedJyutpingField = form?.find(
//     (f) => f.name === "expectedJyutping",
//   );
//   const expectedChineseField = form?.find((f) => f.name === "expectedChinese");

//   const expectedJyutping = expectedJyutpingField?.data?.toString() ?? "";
//   const expectedChinese = expectedChineseField?.data?.toString() ?? "";

//   const toneLessJyutping = expectedJyutping.replace(/[1-6]/g, "")

//   if (!audioFile || !audioFile.data) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing audio file",
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
//       file: new File([audioFile.data], "audio.webm"),
//       model: "whisper-1",
//     });

//     const transcript = transcription.text;

//     const normalizedTranscript = transcript
//       .toLowerCase()
//       .replace(/[^\w\s]/g, "")
//       .trim();

//     // 2️⃣ Ask AI to evaluate pronunciation
//     const completion = await openai.responses.create({
//       model: "gpt-4.1-mini",
// input: `
// You are evaluating a learner's Cantonese pronunciation.

// The learner is speaking **Jyutping romanization**.

// Expected Chinese word:
// ${expectedChinese}

// Correct Jyutping:
// ${expectedJyutping}

// Tone-less Jyutping reference:
// ${toneLessJyutping}

// Automatic speech transcription:
// ${normalizedTranscript}

// Important context:

// - The transcription is produced by a speech recognition model and may be inaccurate.
// - It may contain English-like words approximating Cantonese sounds.
// - Syllables may be merged or misspelled.

// Examples of possible distortions:

// "mhoissan" → m4 hoi1 sam1  
// "do they dumb" → zo6 dei6 dang1  
// "jaw day dung" → zo6 dei6 dung1  

// Your task:

// 1. First interpret the transcription phonetically.
// 2. Convert it into the **closest Jyutping syllables**.
// 3. Compare those syllables with the expected Jyutping.

// Evaluation rules:

// • Compare syllables phonetically, not by spelling.  
// • Penalize if syllables clearly differ.  
// • Minor vowel differences should receive small penalties.  
// • If syllables are merged but still recognizable, be lenient.  

// Tone rules:

// Tone detection from transcription is unreliable.

// If tones cannot be confidently determined:
// - assume tones may be slightly imperfect but understandable
// - apply only a small penalty.

// Scoring guide:

// 100 = extremely clear, native-like pronunciation  
// 90–95 = very good pronunciation with minor imperfections  
// 80–89 = understandable with small pronunciation issues  
// 60–79 = noticeable pronunciation mistakes  
// 40–59 = difficult to understand but partially correct  
// 0–39 = incorrect pronunciation  

// Important rule:

// If the transcription appears to represent the correct word,
// do NOT automatically give 100.
// Typical good pronunciation should score around 90–95.

// Return ONLY valid JSON (no markdown):

// {
//   "score": number,
//   "feedback": string
// }

// Feedback rules:

// • Keep feedback short (1–2 sentences)
// • Mention which syllables were inaccurate if possible
// • Encourage the learner if pronunciation is understandable
// `
//     });

//     const resultText = completion.output_text;

//     let result;

//     try {
//       result = JSON.parse(resultText);
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
