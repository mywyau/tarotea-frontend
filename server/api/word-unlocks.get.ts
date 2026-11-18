import { createError, getQuery } from "h3";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";
import { getUserUnlockBalance } from "~/server/utils/unlock/getUserUnlockBalance";

function normalizeWordIds(input: unknown): string[] {
  if (typeof input !== "string") return [];

  return Array.from(
    new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const userId = user.sub;

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "User id missing",
    });
  }

  const query = getQuery(event);
  const wordIds = normalizeWordIds(query.wordIds);

  const [balance, unlockedWordIds] = await Promise.all([
    getUserUnlockBalance(userId),
    getUnlockedWordIdsForUser(userId, wordIds),
  ]);

  return {
    ...balance,
    unlockedWordIds,
  };
});
