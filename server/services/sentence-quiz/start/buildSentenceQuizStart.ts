import { createError } from "h3";
import { redis } from "~/server/repositories/redis";
import { buildSentenceQuiz } from "~/utils/quiz/buildSentenceQuiz";
import { shuffleFisherYates } from "~/utils/shuffle";
import { loadSentenceProgressMap } from "./loadSentenceProgressMap";
import { loadWordProgressMap } from "./loadWordProgressMap";
import { pickBestVariantForWord } from "./pickBestVariantForWord";

export type LevelSentenceItem = {
  sentenceId: string;
  sentence: string;
  jyutping: string;
  meaning: string;
  sourceWordId: string;
  sourceWord: string;
  sourceWordJyutping: string;
  sourceWordMeaning: string;
  tags: string[];
  sourceFile: string;
};

export type LevelSentenceData = {
  level: string | number;
  title: string;
  totalWords: number;
  totalSentences: number;
  items: LevelSentenceItem[];
};

export type SentenceQuizQuestion = {
  sentenceId: string;
  wordId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  sourceWord: string;
  sourceWordJyutping: string;
};

type QuizSession = {
  version: 1;
  mode: "level-sentences";
  scope: "level";
  slug: string;
  createdAt: string;
  allowedPairs: Array<{
    wordId: string;
    sentenceId: string;
  }>;
};

export type SentenceQuizStartResult = {
  sessionKey: string;
  quiz: {
    mode: "level-sentences";
    level: string;
    title: string;
    totalQuestions: number;
    questions: SentenceQuizQuestion[];
  };
  progress: Record<string, { xp: number; streak: number }>;
};

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

type BuildSentenceQuizStartInput = {
  userId: string;
  slug: string;
  scope: "level";
  cdnBase: string;
};

export async function buildSentenceQuizStart({
  userId,
  slug,
  scope,
  cdnBase,
}: BuildSentenceQuizStartInput): Promise<SentenceQuizStartResult> {
  if (scope !== "level") {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported scope",
    });
  }

  let data: LevelSentenceData;

  try {
    data = await $fetch<LevelSentenceData>(
      `${cdnBase}/sentences/${slug}-sentences.json`,
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "sentence set not found",
    });
  }

  if (!data.items?.length) {
    const sessionKey = crypto.randomUUID();

    const emptySession: QuizSession = {
      version: 1,
      mode: "level-sentences",
      scope: "level",
      slug,
      createdAt: new Date().toISOString(),
      allowedPairs: [],
    };

    await redis.set(
      `quiz:sentences:${userId}:${sessionKey}`,
      JSON.stringify(emptySession),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );

    return {
      sessionKey,
      quiz: {
        mode: "level-sentences",
        level: String(data.level),
        title: data.title,
        totalQuestions: 0,
        questions: [],
      },
      progress: {},
    };
  }

  const sentenceIds = [...new Set(data.items.map((item) => item.sentenceId))];
  const sentenceProgressMap = await loadSentenceProgressMap(userId, sentenceIds);

  const byWord = new Map<string, LevelSentenceItem[]>();

  for (const item of data.items) {
    const existing = byWord.get(item.sourceWordId) ?? [];
    existing.push(item);
    byWord.set(item.sourceWordId, existing);
  }

  const selected: LevelSentenceItem[] = [];

  for (const [, variants] of byWord) {
    if (!variants.length) continue;
    selected.push(pickBestVariantForWord(variants, sentenceProgressMap));
  }

  const shuffledItems = shuffleFisherYates(selected);
  const questions = buildSentenceQuiz(shuffledItems).slice(0, 20);

  const wordIds = [...new Set(questions.map((q) => q.wordId))];
  const progress = await loadWordProgressMap(userId, wordIds);

  const sessionKey = crypto.randomUUID();

  const session: QuizSession = {
    version: 1,
    mode: "level-sentences",
    scope: "level",
    slug,
    createdAt: new Date().toISOString(),
    allowedPairs: questions.map((q) => ({
      wordId: q.wordId,
      sentenceId: q.sentenceId,
    })),
  };

  await redis.set(
    `quiz:sentences:${userId}:${sessionKey}`,
    JSON.stringify(session),
    { ex: QUIZ_SESSION_TTL_SECONDS },
  );

  return {
    sessionKey,
    quiz: {
      mode: "level-sentences",
      level: String(data.level),
      title: data.title,
      totalQuestions: questions.length,
      questions,
    },
    progress,
  };
}