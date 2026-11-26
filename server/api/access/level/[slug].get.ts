import { createError } from "h3";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { purchasedLessonIds } from "~/server/services/lessons/access";
import { requireUser } from "~/server/utils/requireUser";
import { getUserUnlockBalance } from "~/server/utils/unlock/getUserUnlockBalance";
import type { Entitlement } from "~/types/auth/entitlements";
import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels";
import {
  canAccessLevel,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug as string | undefined;

  if (!slug || !isLevelId(slug)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Level not found",
    });
  }

  const levelNumber = levelIdToNumbers(slug);

  if (isComingSoon(levelNumber)) {
    return {
      slug,
      levelNumber,
      isFree: false,
      isComingSoon: true,
      hasFullAccess: false,
      freePreviewIds: [],
      unlockedWordIds: [],
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    };
  }

  const level = await $fetch<{
    id?: string;
    title: string;
    description: string;
    categories: Record<string, Array<{ id: string }>>;
  }>(`/api/index/levels/${slug}`);

  const allWordIds = Object.values(level.categories)
    .flat()
    .map((word) => word.id)
    .filter(Boolean);

  const freePreviewIds = allWordIds.slice(0, FREE_LEVEL_WORD_LIMIT);

  if (isFreeLevel(levelNumber)) {
    return {
      slug,
      levelNumber,
      isFree: true,
      isComingSoon: false,
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

    const entitlement = await getUserEntitlement(userId!);
    entitlementValue = entitlement;
  } catch {
    userId = null;
    entitlementValue = null;
  }

  const hasFullAccess =
    !!userId && canAccessLevel(Boolean(userId), entitlementValue);

  if (hasFullAccess && userId) {
    const balance = await getUserUnlockBalance(userId);

    return {
      slug,
      levelNumber,
      isFree: false,
      isComingSoon: false,
      hasFullAccess: true,
      freePreviewIds,
      unlockedWordIds: [],
      ...balance,
    };
  }

  if (!userId) {
    return {
      slug,
      levelNumber,
      isFree: false,
      isComingSoon: false,
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
    levelNumber,
    isFree: false,
    isComingSoon: false,
    hasFullAccess: false,
    freePreviewIds,
    unlockedWordIds,
    ...balance,
  };
});
