import { readBody, createError } from "h3";
import { requireUser } from "~/server/utils/requireUser";

type DailyWord = {
  id: string;
  word: string;
  meaning: string;
  // add jyutping etc if you need it in the UI
};

export default defineEventHandler(async (event) => {
  await requireUser(event);

  const body = await readBody<{ wordIds: string[] }>(event);

  const wordIds = body?.wordIds;
  if (!Array.isArray(wordIds) || wordIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "wordIds required" });
  }

  // de-dupe + cap (avoid abuse)
  const ids = [...new Set(wordIds)].slice(0, 50);

  const config = useRuntimeConfig();
  const cdnBase = config.public.cdnBase; // e.g. https://<your-cdn>

  // If your JSON is at: `${cdnBase}/words/<id>.json`
  // adjust the path to match your real structure
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const url = `${cdnBase}/words/${id}.json`;
        const word = await $fetch<any>(url);

        // normalize to what Daily page needs:
        return {
          id,
          word: word.word ?? word.cantonese ?? word.text ?? "",
          meaning: word.meaning ?? word.english ?? "",
        } satisfies DailyWord;
      } catch {
        return null;
      }
    })
  );

  // drop missing
  return results.filter(Boolean) as DailyWord[];
});