import { db } from '~/server/db'

export async function deleteUserData(userId: string) {
  await db.query('BEGIN')

  try {
    /**
     * We only delete from the `users` table.
     *
     * The following tables have FOREIGN KEY constraints with
     * ON DELETE CASCADE pointing to users.id:
     *
     * - user_word_progress
     * - entitlements
     *
     * This means Postgres will automatically delete all related
     * rows when the user row is deleted.
     *
     * We intentionally do NOT manually delete from those tables
     * to avoid duplication and future maintenance bugs.
     */
    await db.query(
      `DELETE FROM users WHERE id = $1`,
      [userId]
    )

    await db.query('COMMIT')
  } catch (err) {
    await db.query('ROLLBACK')
    throw err
  }
}
