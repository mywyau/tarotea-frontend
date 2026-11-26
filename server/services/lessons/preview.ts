import { readLessonJson } from "~/server/services/lessons/storage";
import { createError, getRouterParam, type H3Event } from "h3";
import { applyPublicContentCacheControl } from "~/server/utils/cacheControl";
import type { WordEntry } from "~/types/word";

type Preview = Pick<WordEntry, "id" | "word" | "jyutping" | "meaning">;
type Index = {
  title: string; description: string; id?: string; slug?: string; topic?: string; level?: number;
  categories: Record<string, Preview[]>;
};

export async function readPreviewIndex(event: H3Event, scope: "levels" | "topics" | "vocab-quiz") {
  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw createError({ statusCode: 404, statusMessage: "Catalogue not found" });
  }
  const index = await readLessonJson<Index>(scope, id);
  const categories = Object.fromEntries(Object.entries(index.categories).map(([name, words]) => [
    name, words.map(({ id, word, jyutping, meaning }) => ({ id, word, jyutping, meaning })),
  ]));
  applyPublicContentCacheControl(event);
  return {
    id: index.id, slug: index.slug, level: index.level, topic: index.topic,
    title: index.title, description: index.description, categories,
  };
}
