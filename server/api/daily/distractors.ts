import { readBody } from "h3";
import { db } from "~/server/db";

export default defineEventHandler(async (event) => {
  const { wordId, limit = 3 } = await readBody(event);

  if (!wordId) {
    throw createError({ statusCode: 400, statusMessage: "Missing wordId" });
  }

  const result = await db.query(
    `
    select id, word, meaning
    from words
    where id != $1
    order by random()
    limit $2
    `,
    [wordId, limit]
  );

  return {
    distractors: result.rows
  };
});
