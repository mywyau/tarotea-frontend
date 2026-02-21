import { createError, readBody } from 'h3'
import { db } from '~/server/db'
import { requireUser } from '~/server/utils/requireUser'

function utcDayString(d = new Date()): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event)
  const body = await readBody(event).catch(() => ({})) as { totalQuestions?: number }

  const totalQuestions = Number(body.totalQuestions ?? 20)
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0 || totalQuestions > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid totalQuestions' })
  }

  const sessionDate = utcDayString()

  const client = await db.connect()
  await client.query('BEGIN')

  try {
    // 1) ensure daily session exists
    const upsert = await client.query(
      `
      insert into daily_sessions (
        user_id, session_date, completed, xp_earned, created_at, updated_at,
        correct_count, total_questions, word_ids, answered_word_ids, answered_count
      )
      values (
        $1, $2::date, false, 0, now(), now(),
        0, $3, array[]::text[], array[]::text[], 0
      )
      on conflict (user_id, session_date)
      do update set updated_at = now()
      returning
        user_id, session_date, completed, xp_earned, correct_count, total_questions,
        word_ids, answered_word_ids, answered_count
      `,
      [userId, sessionDate, totalQuestions]
    )

    let session = upsert.rows[0]

    // if already has words for today, return
    if (Array.isArray(session.word_ids) && session.word_ids.length > 0) {
      await client.query('COMMIT')
      return { session }
    }

    // 2) pick words from user_word_progress
    const pick = await client.query(
      `
      with candidates as (
        select
          word_id,
          case when next_review_at is not null and next_review_at <= now() then 0 else 1 end as due_bucket,
          coalesce(xp, 0) as xp,
          coalesce(correct_count, 0) as cc,
          coalesce(wrong_count, 0) as wc,
          coalesce(last_seen_at, 'epoch'::timestamptz) as last_seen_at
        from user_word_progress
        where user_id = $1
      ),
      ranked as (
        select word_id
        from candidates
        order by
          due_bucket asc,
          (wc - cc) desc,
          xp asc,
          last_seen_at asc
        limit $2
      )
      select array_agg(word_id) as word_ids
      from ranked
      `,
      [userId, totalQuestions]
    )

    const wordIds: string[] = pick.rows[0]?.word_ids ?? []

    if (wordIds.length === 0) {
      await client.query('COMMIT')
      return { session: { ...session, word_ids: [] }, dailyLocked: true }
    }

    // 3) persist today's stable word list
    const updated = await client.query(
      `
      update daily_sessions
      set word_ids = $3::text[],
          total_questions = $4,
          updated_at = now()
      where user_id = $1 and session_date = $2::date
      returning
        user_id, session_date, completed, xp_earned, correct_count, total_questions,
        word_ids, answered_word_ids, answered_count
      `,
      [userId, sessionDate, wordIds, totalQuestions]
    )

    session = updated.rows[0]

    await client.query('COMMIT')
    return { session }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})