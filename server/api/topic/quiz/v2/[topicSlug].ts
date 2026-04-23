// server/api/topic/quiz/[topicSlug].get.ts

import { getUserEntitlement } from "#imports";
import { createError, getRouterParam } from "h3";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { getUserFromSession } from "~/server/utils/auth";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { Entitlement } from "~/types/auth/entitlements";
import { shuffleFisherYates } from "~/utils/shuffle";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";

type TopicWord = {
  id: string;
  word: string;
  jyutping: string;
  meaning: string;
};

type TopicData = {
  topic: string;
  title: string;
  description: string;
  categories: Record<string, TopicWord[]>;
};

type WordProgress = {
  xp: number;
  streak: number;
};

type QuizQuestion = {
  wordId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

type TopicQuizResponse = {
  topic: string;
  title: string;
  description: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  progressMap: Record<string, WordProgress>;
  wordsById: Record<string, TopicWord>;
  guestPreview?: boolean;
};

const TOTAL_QUESTIONS = 20;
const WEAKEST_QUESTION_RATIO = 0.9;
const WEAKEST_POOL_RATIO = 0.9;

function parseCachedWordProgress(raw: unknown): WordProgress | null {
  if (!raw || typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw) as {
      xp?: unknown;
      streak?: unknown;
    };

    return {
      xp: Number(parsed.xp ?? 0),
      streak: Number(parsed.streak ?? 0),
    };
  } catch {
    return null;
  }
}

function flattenTopicWords(data: TopicData): TopicWord[] {
  const all = Object.values(data.categories ?? {}).flat();
  const seen = new Set<string>();
  const deduped: TopicWord[] = [];

  for (const word of all) {
    if (!word?.id) continue;
    if (seen.has(word.id)) continue;

    seen.add(word.id);
    deduped.push(word);
  }

  return deduped;
}

function buildWordsById(words: TopicWord[]): Record<string, TopicWord> {
  return Object.fromEntries(words.map((w) => [w.id, w]));
}

function parseCachedTopicData(raw: unknown): TopicData | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as TopicData;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as TopicData;
  }

  return null;
}

async function loadTopicData(topicSlug: string): Promise<TopicData> {
  const cacheKey = `topic_data:${topicSlug}`;

  try {
    const cached = await redis.get(cacheKey);
    const parsed = parseCachedTopicData(cached);

    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.error("[topics/quiz] topic cache GET failed", error);
  }

  const cdnBase = useRuntimeConfig().public.cdnBase;

  let data: TopicData;

  try {
    data = await $fetch<TopicData>(`${cdnBase}/topics/${topicSlug}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }

  try {
    await redis.set(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error("[topics/quiz] topic cache SET failed", error);
  }

  return data;
}

async function loadProgressMap(
  userId: string,
  wordIds: string[],
): Promise<Record<string, WordProgress>> {
  if (!wordIds.length) return {};

  const redisKey = `word_progress:${userId}`;
  const progressMap: Record<string, WordProgress> = {};

  let cachedById: Record<string, unknown> = {};

  try {
    const result = await redis.hmget(redisKey, ...wordIds);

    if (Array.isArray(result)) {
      cachedById = Object.fromEntries(
        wordIds.map((id, i) => [id, result[i] ?? null]),
      );
    } else {
      cachedById = (result ?? {}) as Record<string, unknown>;
    }
  } catch (error) {
    console.error("[topics/quiz] Redis HMGET failed", error);
    cachedById = {};
  }

  const missingIds: string[] = [];

  for (const wordId of wordIds) {
    const cached = parseCachedWordProgress(cachedById[wordId]);

    if (cached) {
      progressMap[wordId] = cached;
    } else {
      missingIds.push(wordId);
    }
  }

  if (missingIds.length === 0) {
    return progressMap;
  }

  const { rows } = await db.query(
    `
    select word_id, xp, streak
    from user_word_progress
    where user_id = $1
      and word_id = any($2::text[])
    `,
    [userId, missingIds],
  );

  const foundIds = new Set<string>();
  const redisWrites: Record<string, string> = {};

  for (const row of rows) {
    const progress: WordProgress = {
      xp: Number(row.xp ?? 0),
      streak: Number(row.streak ?? 0),
    };

    foundIds.add(row.word_id);
    progressMap[row.word_id] = progress;
    redisWrites[row.word_id] = JSON.stringify(progress);
  }

  for (const wordId of missingIds) {
    if (foundIds.has(wordId)) continue;

    const zeroProgress: WordProgress = {
      xp: 0,
      streak: 0,
    };

    progressMap[wordId] = zeroProgress;
    redisWrites[wordId] = JSON.stringify(zeroProgress);
  }

  try {
    if (Object.keys(redisWrites).length > 0) {
      await redis.hset(redisKey, redisWrites);
    }
  } catch (error) {
    console.error("[topics/quiz] Redis HSET failed", error);
  }

  return progressMap;
}

function selectWeightedWords(
  words: TopicWord[],
  progressMap: Record<string, WordProgress>,
  totalQuestions = TOTAL_QUESTIONS,
): TopicWord[] {
  if (words.length <= totalQuestions) {
    return shuffleFisherYates(words);
  }

  const weakestSorted = [...words].sort((a, b) => {
    const axp = progressMap[a.id]?.xp ?? 0;
    const bxp = progressMap[b.id]?.xp ?? 0;

    if (axp !== bxp) return axp - bxp;

    const astreak = progressMap[a.id]?.streak ?? 0;
    const bstreak = progressMap[b.id]?.streak ?? 0;

    if (astreak !== bstreak) return astreak - bstreak;

    return a.id.localeCompare(b.id);
  });

  const weakestPoolSize = Math.max(
    totalQuestions,
    Math.ceil(words.length * WEAKEST_POOL_RATIO),
  );

  const weakestIds = new Set(
    weakestSorted.slice(0, weakestPoolSize).map((w) => w.id),
  );

  const weakestPool = shuffleFisherYates(
    words.filter((w) => weakestIds.has(w.id)),
  );

  const nonWeakestPool = shuffleFisherYates(
    words.filter((w) => !weakestIds.has(w.id)),
  );

  const weakestTarget = Math.min(
    weakestPool.length,
    Math.floor(totalQuestions * WEAKEST_QUESTION_RATIO),
  );

  const selected: TopicWord[] = [];

  selected.push(...weakestPool.slice(0, weakestTarget));
  selected.push(...nonWeakestPool.slice(0, totalQuestions - selected.length));

  if (selected.length < totalQuestions) {
    const selectedIds = new Set(selected.map((w) => w.id));

    const remaining = shuffleFisherYates(
      words.filter((w) => !selectedIds.has(w.id)),
    );

    selected.push(...remaining.slice(0, totalQuestions - selected.length));
  }

  return shuffleFisherYates(selected);
}

function buildLabel(
  word: TopicWord,
  direction: "word-to-meaning" | "meaning-to-word",
): string {
  return direction === "word-to-meaning" ? word.meaning : word.word;
}

function buildPrompt(
  word: TopicWord,
  direction: "word-to-meaning" | "meaning-to-word",
): string {
  return direction === "word-to-meaning" ? word.word : word.meaning;
}

function pickDistractorLabels(
  currentWord: TopicWord,
  allWords: TopicWord[],
  direction: "word-to-meaning" | "meaning-to-word",
  count = 3,
): string[] {
  const correctLabel = buildLabel(currentWord, direction);
  const seen = new Set<string>([correctLabel]);

  const labels: string[] = [];

  for (const word of shuffleFisherYates(allWords)) {
    if (word.id === currentWord.id) continue;

    const label = buildLabel(word, direction)?.trim();
    if (!label) continue;
    if (seen.has(label)) continue;

    seen.add(label);
    labels.push(label);

    if (labels.length >= count) break;
  }

  return labels;
}

function buildTopicQuiz(
  selectedWords: TopicWord[],
  allWords: TopicWord[],
): QuizQuestion[] {
  return shuffleFisherYates(selectedWords).map((word) => {
    const direction =
      Math.random() > 0.5 ? "word-to-meaning" : "meaning-to-word";

    const correctLabel = buildLabel(word, direction);
    const prompt = buildPrompt(word, direction);

    const distractors = pickDistractorLabels(word, allWords, direction, 3);
    const options = shuffleFisherYates([correctLabel, ...distractors]);

    return {
      wordId: word.id,
      prompt,
      options,
      correctIndex: options.indexOf(correctLabel),
    };
  });
}

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event);
  const userId = user?.id ?? null;

  await enforceRateLimit(
    userId ? `rl:topic-quiz:${userId}` : "rl:topic-quiz:guest",
    20,
    60,
  );

  const topicSlug = getRouterParam(event, "topicSlug");

  if (!topicSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing topicSlug",
    });
  }

  const topicData = await loadTopicData(topicSlug);

  const allWords = flattenTopicWords(topicData);

  if (!allWords.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No quiz words found for topic",
    });
  }

  const allWordIds = allWords.map((w) => w.id);

  let accessibleWords = allWords;

  if (!userId) {
    accessibleWords = allWords.slice(0, FREE_WORD_LIMIT);
  } else if (!freeTopics.has(topicSlug)) {
    const entitlement = (await getUserEntitlement(
      userId,
    )) as Entitlement | null;
    const hasFullAccess = canAccessTopicWord(true, entitlement, topicSlug);

    if (!hasFullAccess) {
      const freePreviewIds = allWordIds.slice(0, FREE_WORD_LIMIT);
      const unlockedWordIds = await getUnlockedWordIdsForUser(
        userId,
        allWordIds,
      );
      const accessibleWordIdSet = new Set([
        ...freePreviewIds,
        ...unlockedWordIds,
      ]);

      accessibleWords = allWords.filter((word) =>
        accessibleWordIdSet.has(word.id),
      );
    }
  }

  if (!accessibleWords.length) {
    throw createError({
      statusCode: 403,
      statusMessage: "No quiz words available for this topic",
    });
  }

  const accessibleWordIds = accessibleWords.map((w) => w.id);
  const progressMap = userId
    ? await loadProgressMap(userId, accessibleWordIds)
    : Object.fromEntries(
        accessibleWordIds.map((id) => [id, { xp: 0, streak: 0 }]),
      );

  const selectedWords = selectWeightedWords(
    accessibleWords,
    progressMap,
    Math.min(TOTAL_QUESTIONS, accessibleWords.length),
  );

  const questions = buildTopicQuiz(selectedWords, accessibleWords);

  return <TopicQuizResponse>{
    topic: topicData.topic,
    title: topicData.title,
    description: topicData.description,
    totalQuestions: questions.length,
    questions,
    progressMap,
    wordsById: buildWordsById(selectedWords),
    guestPreview: !userId,
  };
});
