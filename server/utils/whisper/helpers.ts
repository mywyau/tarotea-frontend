export function containsLatinLetters(input: string) {
  return /[A-Za-z]/.test(input);
}

export function containsCJK(input: string) {
  return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(input);
}

export function normalizeChinese(input: string) {
  return (input || "").replace(/[，。！？、,.!?\s]/g, "").trim();
}

export function normalizeRomanized(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function levenshtein(a: string, b: string): number {
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

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return clamp(1 - distance / Math.max(a.length, b.length), 0, 1);
}

export function averageLogprob(
  logprobs?: Array<{ token?: string; logprob?: number }>,
): number | null {
  if (!logprobs?.length) return null;
  const values = logprobs
    .map((x) => x.logprob)
    .filter((x): x is number => typeof x === "number");

  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function confidenceLabel(avgLogprob: number | null) {
  if (avgLogprob === null) return "unknown";
  if (avgLogprob > -0.2) return "high";
  if (avgLogprob > -0.8) return "medium";
  return "low";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeConfidence(avgLogprob: number | null): number {
  if (avgLogprob === null) return 0.5;
  return clamp((avgLogprob + 2.5) / 2.4, 0, 1);
}

export function computePronunciationScore(params: {
  similarity: number;
  avgLogprob: number | null;
  isExact: boolean;
}) {
  const conf = normalizeConfidence(params.avgLogprob);

  // Curves similarity a bit so high-quality attempts separate more nicely
  const curvedSim = Math.pow(params.similarity, 1.35);

  // Similarity dominates, confidence lightly adjusts
  let score = curvedSim * 92 + conf * 6;

  // Small bonus for exact match
  if (params.isExact) score += 2;

  return Math.round(clamp(score, 0, 100));
}

export function buildResult(params: {
  expectedChinese: string;
  expectedJyutping: string;
  transcript: string;
  avgLogprob: number | null;
}) {
  const expected = normalizeChinese(params.expectedChinese);
  const heard = normalizeChinese(params.transcript);
  const heardRomanized = normalizeRomanized(params.transcript);
  const expectedRomanized = normalizeRomanized(params.expectedJyutping);
  const sim = similarity(expected, heard);
  const confidence = confidenceLabel(params.avgLogprob);
  const unit = expected.length <= 2 ? "word" : "phrase";

  if (
    containsLatinLetters(params.transcript) &&
    heardRomanized &&
    expectedRomanized &&
    heardRomanized === expectedRomanized
  ) {
    return {
      score: 96,
      matchType: "romanized-match",
      confidence,
      feedback: `Nice, I heard a correct romanized reading (${params.expectedJyutping}). Try saying it again as Cantonese Chinese characters for the best check.`,
    };
  }

  if (containsLatinLetters(params.transcript)) {
    return {
      score: 0,
      matchType: "wrong-language",
      confidence,
      feedback: `I'm not sure if I heard anything or I heard English or Latin letters. Please try again and say the Cantonese ${unit} only.`,
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

  if (!containsCJK(heard)) {
    return {
      score: 0,
      matchType: "wrong-language",
      confidence,
      feedback: `I didn’t hear a Chinese ${unit} clearly. Please say the Cantonese ${unit} only.`,
    };
  }

  const score = computePronunciationScore({
    similarity: sim,
    avgLogprob: params.avgLogprob,
    isExact: heard === expected,
  });

  const isContainedButMeaningful =
    heard.length >= 2 &&
    expected.length >= 2 &&
    (heard.includes(expected) || expected.includes(heard));

  if (heard === expected) {
    return {
      score,
      matchType: "exact",
      confidence,
      feedback: `Nice, I heard exactly “${params.expectedChinese}”. That means your ${unit} was perfectly understood. Keep aiming for something similar to this.`,
    };
  }

  if (
    expected.length === 1 &&
    heard.length === 1 &&
    confidence !== "low"
  ) {
    return {
      score: Math.max(score, 72),
      matchType: "single-char-homophone",
      confidence,
      feedback: `Close. I heard “${params.transcript}” while the target was “${params.expectedChinese}”. For single-character words, this is often a homophone mix-up, so you're likely very close.`,
    };
  }

  if (sim >= 0.85) {
    return {
      score,
      matchType: "near-exact",
      confidence,
      feedback: `Very close. I heard “${params.transcript}”, which is close to “${params.expectedChinese}”. Good job, try to match the full phrase even more closely.`,
    };
  }

  if (isContainedButMeaningful || sim >= 0.7) {
    return {
      score,
      matchType: "close",
      confidence,
      feedback: `Not Bad. I heard “${params.transcript}”. The target was “${params.expectedChinese}”. Try saying the full ${unit} more clearly.`,
    };
  }

  if (sim >= 0.5) {
    return {
      score,
      matchType: "partial",
      confidence,
      feedback: `Partly understood. I heard “${params.transcript}”. Might just of been unlucky. Focus on the full phrase, do some trial runs or try again.`,
    };
  }

  return {
    score,
    matchType: "wrong",
    confidence,
    feedback: `I heard “${params.transcript}”, which sounds quite different from “${params.expectedChinese}”. Listen once more and repeat slowly: ${params.expectedJyutping}.`,
  };
}
