import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import {
  unlockHydratedKey,
  unlockSetKey,
} from "~/server/services/cache/wordUnlockCache";

export async function deleteUserData(userId: string) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw err;
  } finally {
    client.release();
  }

  try {
    await redis.del(
      unlockSetKey(userId),
      unlockHydratedKey(userId),
    );
  } catch (err) {
    console.error("Failed to clear word unlock cache after user deletion", {
      userId,
      error: err,
    });
  }
}