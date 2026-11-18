// server/repositories/whisper/consumeWhisperAttemptMonthlyBySubject.ts
import { db } from "~/server/repositories/db"
import { createError } from "h3"

export async function consumeWhisperAttemptMonthlyBySubject(
  subjectKey: string,
  limit: number,
) {
  const result = await db.query<{
    attempts: number
  }>(
    `
    insert into ai_usage_monthly_subject (subject_key, month, attempts)
    values ($1, date_trunc('month', now())::date, 1)
    on conflict (subject_key, month)
    do update
      set attempts = ai_usage_monthly_subject.attempts + 1,
          updated_at = now()
    where ai_usage_monthly_subject.attempts < $2
    returning attempts
    `,
    [subjectKey, limit],
  )

  const row = result.rows[0]

  if (!row) {
    throw createError({
      statusCode: 429,
      statusMessage: "Monthly pronunciation limit reached",
    })
  }

  const attempts = Number(row.attempts)

  return {
    attempts,
    remaining: Math.max(limit - attempts, 0),
  }
}

export async function refundWhisperAttemptMonthlyBySubject(
  subjectKey: string,
): Promise<void> {
  await db.query(
    `
    update ai_usage_monthly_subject
    set attempts = greatest(attempts - 1, 0),
        updated_at = now()
    where subject_key = $1
      and month = date_trunc('month', now())::date
      and attempts > 0
    `,
    [subjectKey],
  )
}
