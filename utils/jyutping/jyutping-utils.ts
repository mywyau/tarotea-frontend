import type { ScoreResult } from "~/types/jyutping/jyutping-training-types";

export function normalizeJyutping(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[，。,.;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-/g, " ");
}

export function baseSound(jp: string): string {
  return normalizeJyutping(jp).replace(/[1-6]/g, "").replace(/\s+/g, "");
}

export function canonicalNoSpace(jp: string): string {
  return normalizeJyutping(jp).replace(/\s+/g, "");
}

export function splitSyllables(jp: string): string[] {
  const n = normalizeJyutping(jp);
  if (!n) return [];
  return n.split(" ").filter(Boolean);
}

export function splitUserJyutping(raw: string): string[] {
  const normalized = normalizeJyutping(raw).replace(/\s+/g, "");
  return normalized.match(/[a-z]+[1-6]?/g) ?? [];
}

export function stripToneToken(token: string): string {
  return token.replace(/[1-6]/g, "");
}

export function scoreJyutpingAttempt(
  userRaw: string,
  answerRaw: string,
): ScoreResult {
  const user = normalizeJyutping(userRaw);
  const ans = normalizeJyutping(answerRaw);

  if (!user) {
    return {
      passed: false,
      perfect: false,
      message: "Start typing the jyutping.",
    };
  }

  const userBase = baseSound(user);
  const ansBase = baseSound(ans);

  const passed = userBase === ansBase;
  // const perfect = canonicalNoSpace(user) === canonicalNoSpace(ans)

  const perfect =
    baseSound(user) === baseSound(ans) &&
    user.replace(/\s+/g, "") === ans.replace(/\s+/g, "");

  if (perfect) {
    return {
      passed: true,
      perfect: true,
      message: "Correct sound and tone.",
    };
  }

  if (passed) {
    return {
      passed: true,
      perfect: false,
      message: "Correct sound.",
    };
  }

  return {
    passed: false,
    perfect: false,
    message: "Not quite — try again.",
  };
}
