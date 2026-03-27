import { db } from "~/server/repositories/db";
import { WordProgressRow } from "./types";

export async function loadWordProgressMap(userId: string, wordIds: string[]) {
  if (wordIds.length === 0) {
    return {} as Record<string, { xp: number; streak: number }>;
  }

  const uniqueWordIds = [...new Set(wordIds)];

  const { rows } = await db.query<WordProgressRow>(
    `
    select word_id, xp, streak
    from user_word_progress
    where user_id = $1
      and word_id = any($2::text[])
    `,
    [userId, uniqueWordIds],
  );

  const progressMap: Record<string, { xp: number; streak: number }> =
    Object.fromEntries(
      uniqueWordIds.map((wordId) => [wordId, { xp: 0, streak: 0 }]),
    );

  for (const row of rows) {
    progressMap[row.word_id] = {
      xp: Number(row.xp ?? 0),
      streak: Number(row.streak ?? 0),
    };
  }

  return progressMap;
}
