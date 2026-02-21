import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
    
  const userId = await requireUser(event);

  const { rows } = await db.query(`
    select
      coalesce(sum(xp), 0) as total_xp,
      count(*) filter (where xp >= 200) as words_mastered,
      count(*) as words_seen,
      coalesce(sum(correct_count), 0) as total_correct,
      coalesce(sum(wrong_count), 0) as total_wrong
    from user_word_progress
    where user_id = $1
  `, [userId]);

  return rows[0];
});