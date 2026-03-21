import { db } from "~/server/db";

export async function recordWhisperAttempt(userId: string) {
  await db.query(
    `
    INSERT INTO ai_pronunciation_attempts (user_id)
    VALUES ($1)
    `,
    [userId]
  );
}