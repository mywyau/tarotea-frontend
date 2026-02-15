import { createError, getQuery } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  const query = getQuery(event);
  const wordIdsParam = query.wordIds;

  if (!wordIdsParam || typeof wordIdsParam !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "wordIds query param required",
    });
  }

  const wordIds = wordIdsParam
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

  if (!wordIds.length) {
    return {};
  }

  const { rows } = await db.query(
    `
    select word_id, xp, streak
    from user_word_progress
    where user_id = $1
    and word_id = any($2::text[])
    `,
    [userId, wordIds],
  );

  const progressMap: Record<string, { xp: number; streak: number }> = {};

  for (const row of rows) {
    progressMap[row.word_id] = {
      xp: row.xp,
      streak: row.streak,
    };
  }

  return progressMap;
});
