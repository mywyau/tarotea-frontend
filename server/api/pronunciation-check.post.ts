import { createError, readMultipartFormData } from "h3";
import OpenAI from "openai";
import { getUserEntitlement } from "../utils/getEntitlement";
import { requireUser } from "../utils/requireUser";
import { consumeWhisperAttemptMonthly } from "../utils/whisper/consumeWhisperAttemptMonthly";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function containsLatinLetters(input: string) {
  return /[A-Za-z]/.test(input);
}

function containsCJK(input: string) {
  return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(input);
}

function normalizeChinese(input: string) {
  return (input || "").replace(/[，。！？、,.!?\s]/g, "").trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function averageLogprob(
  logprobs?: Array<{ token?: string; logprob?: number }>,
): number | null {
  if (!logprobs?.length) return null;
  const values = logprobs
    .map((x) => x.logprob)
    .filter((x): x is number => typeof x === "number");

  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function confidenceLabel(avgLogprob: number | null) {
  if (avgLogprob === null) return "unknown";
  if (avgLogprob > -0.2) return "high";
  if (avgLogprob > -0.8) return "medium";
  return "low";
}

function buildResult(params: {
  expectedChinese: string;
  expectedJyutping: string;
  transcript: string;
  avgLogprob: number | null;
  targetMode?: string;
  targetWord?: string;
}) {
  const expected = normalizeChinese(params.expectedChinese);
  const heard = normalizeChinese(params.transcript);
  const sim = similarity(expected, heard);
  const confidence = confidenceLabel(params.avgLogprob);
  const len = expected.length;
  const isPhrase = params.targetMode === "phrase";
  const unit = isPhrase ? "phrase" : "word";

  const normalizedTargetWord = normalizeChinese(params.targetWord || "");
  const containsTargetWord =
    !normalizedTargetWord || heard.includes(normalizedTargetWord);

  if (containsLatinLetters(params.transcript)) {
    return {
      score: 0,
      matchType: "wrong-language",
      confidence,
      feedback: `I heard English or Latin letters. Please say the Cantonese ${unit} only.`,
    };
  }

  if (!containsCJK(heard)) {
    return {
      score: 0,
      matchType: "wrong-language",
      confidence,
      feedback: `I didn’t hear a Chinese ${unit} clearly. Please say the Cantonese ${unit} only.`,
    };
  }

  if (!heard) {
    return {
      score: 0,
      matchType: "unclear",
      confidence,
      feedback: `I couldn’t hear a clear attempt. Try again in a quiet place and say only the target ${unit}.`,
    };
  }

  // In phrase mode, require the core target word to appear if you have it
  if (isPhrase && normalizedTargetWord && !containsTargetWord) {
    return {
      score: 15,
      matchType: "wrong",
      confidence,
      feedback: `I heard “${params.transcript}”, but I couldn’t clearly hear the target word “${params.targetWord}” inside the phrase. Try again: ${params.expectedJyutping}.`,
    };
  }

  // Exact match after normalization
  if (heard === expected) {
    const score =
      confidence === "high" ? 92 : confidence === "medium" ? 84 : 76;

    return {
      score,
      matchType: "exact",
      confidence,
      feedback: `Nice — I heard exactly “${params.expectedChinese}”. That means your ${unit} was understood. Keep aiming for ${params.expectedJyutping}.`,
    };
  }

  // Phrase mode: treat very high similarity as near-exact
  if (isPhrase && sim >= 0.85) {
    const score =
      confidence === "high" ? 88 : confidence === "medium" ? 80 : 72;

    return {
      score,
      matchType: "near-exact",
      confidence,
      feedback: `Very close. I heard “${params.transcript}”, which is a natural variant of “${params.expectedChinese}”. Good job — try to match the full phrase even more closely: ${params.expectedJyutping}.`,
    };
  }

  // If expected appears inside heard, or vice versa
  if (heard.includes(expected) || expected.includes(heard)) {
    return {
      score: confidence === "high" ? 82 : 74,
      matchType: "close",
      confidence,
      feedback: `Close. I heard “${params.transcript}”. The target was “${params.expectedChinese}”. Try saying the full ${unit} clearly: ${params.expectedJyutping}.`,
    };
  }

  // Phrase-friendly scoring
  if (isPhrase) {
    if (sim >= 0.7) {
      return {
        score: confidence === "high" ? 72 : 64,
        matchType: "close",
        confidence,
        feedback: `Close. I heard “${params.transcript}” instead of “${params.expectedChinese}”. Try saying the whole phrase a bit more clearly and naturally: ${params.expectedJyutping}.`,
      };
    }

    if (sim >= 0.5) {
      return {
        score: 45,
        matchType: "partial",
        confidence,
        feedback: `Partly understood. I heard “${params.transcript}”. Try again and focus on the full phrase: ${params.expectedJyutping}.`,
      };
    }

    return {
      score: 15,
      matchType: "wrong",
      confidence,
      feedback: `I heard “${params.transcript}”, which sounds quite different from “${params.expectedChinese}”. Listen once more and repeat slowly: ${params.expectedJyutping}.`,
    };
  }

  // Word scoring
  if (len <= 2) {
    if (sim >= 0.5) {
      return {
        score: confidence === "high" ? 72 : 64,
        matchType: "close",
        confidence,
        feedback: `Close. I heard “${params.transcript}” instead of “${params.expectedChinese}”. Try again and focus on the exact word: ${params.expectedJyutping}.`,
      };
    }

    return {
      score: 20,
      matchType: "wrong",
      confidence,
      feedback: `I heard “${params.transcript}”, which sounds different from “${params.expectedChinese}”. Listen once more and repeat slowly: ${params.expectedJyutping}.`,
    };
  }

  if (len === 3) {
    if (sim >= 0.66) {
      return {
        score: confidence === "high" ? 72 : 64,
        matchType: "close",
        confidence,
        feedback: `Close. I heard “${params.transcript}” instead of “${params.expectedChinese}”. Try saying each syllable more clearly: ${params.expectedJyutping}.`,
      };
    }

    if (sim >= 0.33) {
      return {
        score: 45,
        matchType: "partial",
        confidence,
        feedback: `Partly understood. I heard “${params.transcript}”. Try again and focus on the target pronunciation: ${params.expectedJyutping}.`,
      };
    }

    return {
      score: 20,
      matchType: "wrong",
      confidence,
      feedback: `I heard “${params.transcript}”, which sounds quite different from “${params.expectedChinese}”. Listen once more and repeat slowly: ${params.expectedJyutping}.`,
    };
  }

  if (sim >= 0.7) {
    return {
      score: confidence === "high" ? 68 : 60,
      matchType: "close",
      confidence,
      feedback: `Close. I heard “${params.transcript}” instead of “${params.expectedChinese}”. Try slowing down and saying each syllable more clearly: ${params.expectedJyutping}.`,
    };
  }

  if (sim >= 0.4) {
    return {
      score: 40,
      matchType: "partial",
      confidence,
      feedback: `Partly understood, but not clearly enough. I heard “${params.transcript}”. Try again and focus on the target pronunciation: ${params.expectedJyutping}.`,
    };
  }

  return {
    score: 15,
    matchType: "wrong",
    confidence,
    feedback: `I heard “${params.transcript}”, which sounds quite different from “${params.expectedChinese}”. Listen once more and repeat slowly: ${params.expectedJyutping}.`,
  };
}

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  const entitlement = await getUserEntitlement(userId);

  const isPaid =
    entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan);

  const limit = isPaid ? 5000 : 10;

  const form = await readMultipartFormData(event);
  const MAX_AUDIO_SIZE = 1_000_000;

  const audioFile = form?.find((f) => f.name === "audio");

  const targetModeField = form?.find((f) => f.name === "targetMode");
  const targetWordField = form?.find((f) => f.name === "targetWord");

  const targetMode = targetModeField?.data?.toString() ?? "word";
  const targetWord = targetWordField?.data?.toString() ?? "";

  const expectedJyutpingField = form?.find(
    (f) => f.name === "expectedJyutping",
  );
  const expectedChineseField = form?.find((f) => f.name === "expectedChinese");

  const expectedJyutping = expectedJyutpingField?.data?.toString() ?? "";
  const expectedChinese = expectedChineseField?.data?.toString() ?? "";

  if (!expectedChinese || !expectedJyutping) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing pronunciation/chinese word metadata",
    });
  }

  if (!audioFile?.data) {
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

  const { remaining } = await consumeWhisperAttemptMonthly(userId, limit);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile.data], "recording.webm", {
        type: "audio/webm",
      }),
      model: "gpt-4o-mini-transcribe",
      language: "zh",
      temperature: 0,
      response_format: "json",
      include: ["logprobs"],
      prompt: `
Do not normalize toward any expected answer.
Transcribe exactly what was spoken.
If the speech is Mandarin, return pinyin with tone numbers.
If the speech is Cantonese, return Chinese characters only.
If the speech is English, return English.`,
      //       prompt: `Transcribe spoken Hong Kong Cantonese only.
      // Do not translate.
      // Do not romanize.
      // Return only the spoken Chinese characters if heard.
      // Expected phrase: ${expectedChinese}.`,
    });

    const transcript = transcription.text ?? "";
    const avgLogprob = averageLogprob(transcription.logprobs);

    console.log("[pronunciation-check]", {
      expectedChinese,
      transcript,
      normalizedExpected: normalizeChinese(expectedChinese),
      normalizedHeard: normalizeChinese(transcript),
      similarity: similarity(
        normalizeChinese(expectedChinese),
        normalizeChinese(transcript),
      ),
      avgLogprob,
    });

    const result = buildResult({
      expectedChinese,
      expectedJyutping,
      transcript,
      avgLogprob,
      targetMode,
    });

    return {
      transcript,
      heardText: transcript,
      expectedChinese,
      expectedJyutping,
      score: result.score,
      matchType: result.matchType,
      confidence: result.confidence,
      feedback: result.feedback,
      remainingAttempts: remaining,
      limit,
    };
  } catch (err) {
    console.error(err);

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to process pronunciation",
    });
  }
});
