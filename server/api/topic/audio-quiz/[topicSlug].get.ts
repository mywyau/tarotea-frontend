// server/api/topic/audio-quiz/[topicSlug].get.ts

import { createError, getRouterParam } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";

type TopicWord = {
  id: string;
  word: string;
  jyutping: string;
  meaning: string;

  // optional audio fields if present in your JSON
  audioKey?: string;
  audio?: string;
  audioFile?: string;
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

type AudioQuizQuestion = {
  type: "audio";
  wordId: string;
  audioKey: string;
  options: string[];
  correctIndex: number;
};

type TopicAudioQuizResponse = {
  topic: string;
  title: string;
  description: string;
  totalQuestions: number;
  questions: AudioQuizQuestion[];
  progressMap: Record<string, WordProgress>;
  wordsById: Record<string, TopicWord>;
};

const TOTAL_QUESTIONS = 20;
const WEAKEST_QUESTION_RATIO = 0.6;
const WEAKEST_POOL_RATIO = 0.5;

function shuffleFisherYates<T>(input: T[]): T[] {
  const arr = [...input];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

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

function pickProgressMap(
  progressMap: Record<string, WordProgress>,
  wordIds: string[],
): Record<string, WordProgress> {
  return Object.fromEntries(
    wordIds.map((id) => [id, progressMap[id] ?? { xp: 0, streak: 0 }]),
  );
}

function normalizeAudioKey(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) return trimmed;

  // full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const marker = "/audio/";
      const idx = url.pathname.indexOf(marker);

      if (idx >= 0) {
        return url.pathname.slice(idx + marker.length).replace(/^\/+/, "");
      }

      return url.pathname.replace(/^\/+/, "");
    } catch {
      return trimmed;
    }
  }

  // stored as "/audio/foo.mp3"
  if (trimmed.startsWith("/audio/")) {
    return trimmed.replace(/^\/audio\//, "");
  }

  // stored as "audio/foo.mp3"
  if (trimmed.startsWith("audio/")) {
    return trimmed.replace(/^audio\//, "");
  }

  return trimmed;
}

function resolveAudioKey(word: TopicWord): string | null {
  const candidates = [word.audioKey, word.audio, word.audioFile];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeAudioKey(candidate);
    }
  }

  // Fallback assumption: audio files are stored by "<wordId>.mp3"
  // Change this if your actual naming scheme is different.
  if (word.id?.trim()) {
    return `${word.id}.mp3`;
  }

  return null;
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
    console.error("[topic/audio-quiz] topic cache GET failed", error);
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
    console.error("[topic/audio-quiz] topic cache SET failed", error);
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
    console.error("[topic/audio-quiz] Redis HMGET failed", error);
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
    console.error("[topic/audio-quiz] Redis HSET failed", error);
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

function pickDistractorOptions(
  currentWord: TopicWord,
  allWords: TopicWord[],
  count = 3,
): string[] {
  const correct = currentWord.word.trim();
  const seen = new Set<string>([correct]);
  const options: string[] = [];

  for (const word of shuffleFisherYates(allWords)) {
    if (word.id === currentWord.id) continue;

    const candidate = word.word?.trim();
    if (!candidate) continue;
    if (seen.has(candidate)) continue;

    seen.add(candidate);
    options.push(candidate);

    if (options.length >= count) break;
  }

  return options;
}

function buildTopicAudioQuiz(
  selectedWords: TopicWord[],
  allWords: TopicWord[],
): AudioQuizQuestion[] {
  return shuffleFisherYates(selectedWords).map((word) => {
    const audioKey = resolveAudioKey(word);

    if (!audioKey) {
      throw createError({
        statusCode: 500,
        statusMessage: `Missing audio for word ${word.id}`,
      });
    }

    const distractors = pickDistractorOptions(word, allWords, 3);

    const options = shuffleFisherYates([word.word, ...distractors]);

    return {
      type: "audio" as const,
      wordId: word.id,
      audioKey,
      options,
      correctIndex: options.indexOf(word.word),
    };
  });
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  await enforceRateLimit(`rl:topic-audio-quiz:${userId}`, 20, 60); // gentler rate limit
  const topicSlug = getRouterParam(event, "topicSlug");

  if (!topicSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing topicSlug",
    });
  }

  const topicData = await loadTopicData(topicSlug);
  const allWords = flattenTopicWords(topicData);

  const audioWords = allWords.filter((word) => !!resolveAudioKey(word));

  if (!audioWords.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No audio quiz words found for topic",
    });
  }

  const audioWordIds = audioWords.map((w) => w.id);
  const fullProgressMap = await loadProgressMap(userId, audioWordIds);

  const selectedWords = selectWeightedWords(
    audioWords,
    fullProgressMap,
    Math.min(TOTAL_QUESTIONS, audioWords.length),
  );

  const questions = buildTopicAudioQuiz(selectedWords, audioWords);
  const selectedWordIds = selectedWords.map((w) => w.id);

  return <TopicAudioQuizResponse>{
    topic: topicData.topic,
    title: topicData.title,
    description: topicData.description,
    totalQuestions: questions.length,
    questions,
    progressMap: pickProgressMap(fullProgressMap, selectedWordIds),
    wordsById: buildWordsById(selectedWords),
  };
});
