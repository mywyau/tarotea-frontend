import { getRouterParam, type H3Event } from "h3";
import type { LevelSentenceItem } from "~/server/services/sentence-quiz/start/types";
import { contentSlug, readLessonJson } from "./storage";
import { allowedLessonIds, lessonReader } from "./access";

export async function readSentenceFeed(event: H3Event, directory: "sentences" | "topic-sentences") {
  const id = contentSlug(getRouterParam(event, "id"));
  const userId = await lessonReader(event);
  const feed = await readLessonJson<{
    level?: number;
    topic?: string;
    title: string;
    items: LevelSentenceItem[];
  }>(directory, id + "-sentences");
  const scope = directory === "sentences" ? "levels" : "topics";
  const allowed = await allowedLessonIds(
    feed.items.map(item => item.sourceWordId), userId, `${scope}/${id}`,
  );
  const items = feed.items.filter(item => allowed.has(item.sourceWordId));
  return {
    level: feed.level,
    topic: feed.topic,
    title: feed.title,
    totalWords: allowed.size,
    totalSentences: items.length,
    items,
  };
}
