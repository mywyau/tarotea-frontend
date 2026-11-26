import { createError } from "h3";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { purchasedLessonIds } from "~/server/services/lessons/access";
import { requireUser } from "~/server/utils/requireUser";
import { getUserUnlockBalance } from "~/server/utils/unlock/getUserUnlockBalance";
import type { Entitlement } from "~/types/auth/entitlements";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug as string | undefined;

  if (!slug) {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }

  let topic: {
    id?: string;
    title: string;
    description: string;
    categories: Record<string, Array<{ id: string }>>;
  };

  try {
    topic = await $fetch(`/api/index/topics/${slug}`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }

  const allWordIds = Object.values(topic.categories)
    .flat()
    .map((word) => word.id)
    .filter(Boolean);

  const freePreviewIds = allWordIds.slice(0, FREE_WORD_LIMIT);
  const isFree = freeTopics.has(slug);

  if (isFree) {
    return {
      slug,
      topicId: topic.id ?? slug,
      isFree: true,
      hasFullAccess: true,
      freePreviewIds,
      unlockedWordIds: [],
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    };
  }

  let userId: string | null = null;
  let entitlementValue: Entitlement | null = null;

  try {
    const user = await requireUser(event);
    userId = user.sub ?? null;

    // Adjust this import/function name if your entitlement helper differs.

    const entitlement = await getUserEntitlement(userId!);
    entitlementValue = entitlement;
  } catch {
    userId = null;
    entitlementValue = null;
  }

  const hasFullAccess =
    !!userId && canAccessTopicWord(true, entitlementValue, slug);

  if (hasFullAccess && userId) {
    const balance = await getUserUnlockBalance(userId);

    return {
      slug,
      topicId: topic.id ?? slug,
      isFree: false,
      hasFullAccess: true,
      freePreviewIds,
      unlockedWordIds: [],
      ...balance,
    };
  }

  if (!userId) {
    return {
      slug,
      topicId: topic.id ?? slug,
      isFree: false,
      hasFullAccess: false,
      freePreviewIds,
      unlockedWordIds: [],
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    };
  }

  const [balance, unlockedWordIds] = await Promise.all([
    getUserUnlockBalance(userId),
    purchasedLessonIds(userId, allWordIds),
  ]);

  return {
    slug,
    topicId: topic.id ?? slug,
    isFree: false,
    hasFullAccess: false,
    freePreviewIds,
    unlockedWordIds,
    ...balance,
  };
});
