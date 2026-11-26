import { contentSlug, readLessonJson } from "~/server/services/lessons/storage";
import { requireLesson } from "~/server/services/lessons/access";
import type { WordEntry } from "~/types/word";

export default defineEventHandler(async event => {
  const id = contentSlug(getRouterParam(event, "id"));
  await requireLesson(event, id);
  return readLessonJson<WordEntry>("words", id);
});
