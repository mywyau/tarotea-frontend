import { allowedLessonIds } from "~/server/services/lessons/access";
import { readLessonJson } from "~/server/services/lessons/storage";
import { createError } from "h3";
import { shuffleFisherYates } from "~/utils/shuffle";
import { loadSentenceProgressMap } from "./loadSentenceProgressMap";
import { pickBestVariantForWord } from "./pickBestVariantForWord";
import type {
  LevelSentenceData,
  LevelSentenceItem,
  LoadSentencePoolInput,
  SentencePoolResult,
} from "./types";

export async function loadSentencePool({
  userId,
  slug,
  scope,
}: LoadSentencePoolInput): Promise<SentencePoolResult> {
  if (scope !== "level") {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported scope",
    });
  }

  const data = await readLessonJson<LevelSentenceData>("sentences", slug + "-sentences");

  const allowed = await allowedLessonIds((data.items ?? []).map(item => item.sourceWordId), userId, `levels/${slug}`);
  data.items = (data.items ?? []).filter(item => allowed.has(item.sourceWordId));

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
