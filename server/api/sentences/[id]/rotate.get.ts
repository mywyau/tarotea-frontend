// /server/api/sentences/[id]/rotate.get.ts
import { createError, getRouterParam } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";
import { shuffleFisherYates } from "~/utils/shuffle";

type LevelSentenceItem = {
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

type LevelSentenceData = {
  level: string | number;
  title: string;
  totalWords: number;
  totalSentences: number;
  items: LevelSentenceItem[];
};

type SentenceProgress = {
  seenCount: number;
  lastSeenAt: string | Date | null;
};

function pickBestVariantForWord(
  variants: LevelSentenceItem[],
  progressMap: Map<string, SentenceProgress>,
): LevelSentenceItem {
  // Shuffle first so ties do not always pick the same sentence
  const randomized = shuffleFisherYates([...variants]);

  const unseen = randomized.filter(
    (variant) => !progressMap.has(variant.sentenceId),
  );

  if (unseen.length > 0) {
    return unseen[0];
  }

  // If all have been seen, prefer:
  // 1. lowest seenCount
  // 2. oldest lastSeenAt
  const sortedSeen = randomized.sort((a, b) => {
    const aProgress = progressMap.get(a.sentenceId);
    const bProgress = progressMap.get(b.sentenceId);

    const aSeenCount = aProgress?.seenCount ?? 0;
    const bSeenCount = bProgress?.seenCount ?? 0;

    if (aSeenCount !== bSeenCount) {
      return aSeenCount - bSeenCount;
    }

    const aLastSeenMs = aProgress?.lastSeenAt
      ? new Date(aProgress.lastSeenAt).getTime()
      : 0;

    const bLastSeenMs = bProgress?.lastSeenAt
      ? new Date(bProgress.lastSeenAt).getTime()
      : 0;

    return aLastSeenMs - bLastSeenMs;
  });

  return sortedSeen[0];
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  let data: LevelSentenceData;

  try {
    data = await $fetch<LevelSentenceData>(
      `${cdnBase}/sentences/${id}-sentences.json`,
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "sentence set not found",
    });
  }

  if (!data.items?.length) {
    return {
      ...data,
      totalSentences: 0,
      items: [],
    };
  }

  const sentenceIds = data.items.map((item) => item.sentenceId);

  const progressMap = new Map<string, SentenceProgress>();

  if (sentenceIds.length > 0) {
    const { rows } = await db.query(
      `
      select sentence_id, seen_count, last_seen_at
      from user_sentence_progress
      where user_id = $1
        and sentence_id = any($2::text[])
      `,
      [userId, sentenceIds],
    );

    for (const row of rows) {
      progressMap.set(row.sentence_id, {
        seenCount: Number(row.seen_count ?? 0),
        lastSeenAt: row.last_seen_at ?? null,
      });
    }
  }

  const byWord = new Map<string, LevelSentenceItem[]>();

  for (const item of data.items) {
    const existing = byWord.get(item.sourceWordId) ?? [];
    existing.push(item);
    byWord.set(item.sourceWordId, existing);
  }

  const selected: LevelSentenceItem[] = [];

  for (const [, variants] of byWord) {
    if (!variants.length) continue;
    selected.push(pickBestVariantForWord(variants, progressMap));
  }

  return {
    ...data,
    totalSentences: selected.length,
    items: shuffleFisherYates(selected),
  };
});
