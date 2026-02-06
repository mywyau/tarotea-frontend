import { db } from '~/server/db'

export async function deleteUserData(userId: string) {
  
  await db.query('BEGIN')

  try {
    // 3️⃣ Delete entitlements / subscriptions
    await db.query(
      `DELETE FROM entitlements WHERE user_id = $1`,
      [userId]
    )

    // 4️⃣ Delete the user record last
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
