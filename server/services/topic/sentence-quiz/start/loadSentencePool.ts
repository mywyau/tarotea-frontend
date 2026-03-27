import { createError } from "h3";
import { shuffleFisherYates } from "~/utils/shuffle";
import { loadSentenceProgressMap } from "./loadSentenceProgressMap";
import { pickBestVariantForWord } from "./pickBestVariantForWord";
import {
  LevelSentenceData,
  LevelSentenceItem,
  LoadSentencePoolInput,
  SentencePoolResult,
} from "../types";

export async function loadSentencePool({
  userId,
  slug,
  scope,
  cdnBase,
}: LoadSentencePoolInput): Promise<SentencePoolResult> {
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
    return {
      level: String(data.level),
      title: data.title,
      totalWords: Number(data.totalWords ?? 0),
      totalSentences: 0,
      items: [],
    };
  }

  const sentenceIds = [...new Set(data.items.map((item) => item.sentenceId))];
  const sentenceProgressMap = await loadSentenceProgressMap(
    userId,
    sentenceIds,
  );

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

  const items = shuffleFisherYates(selected);

  return {
    level: String(data.level),
    title: data.title,
    totalWords: Number(data.totalWords ?? 0),
    totalSentences: items.length,
    items,
  };
}
