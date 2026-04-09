import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import {
  canAccessLevelWord,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const category = to.params.category as string | undefined;
  const id = to.params.id as string | undefined;
  const idx = to.params.idx as string | undefined;

  if (!category || !id || !idx) return;

  const { entitlement, resolve } = useMeStateV2();
  await resolve();

  const isLevelRoute = isLevelId(category);

  if (isLevelRoute) {
    const levelNumber = levelIdToNumbers(category);

    if (isFreeLevel(levelNumber)) return;

    if (isComingSoon(levelNumber)) {
      return navigateTo("/coming-soon");
    }

    if (canAccessLevelWord(levelNumber, entitlement.value)) {
      return;
    }

    const levels = await $fetch(`/api/index/levels/${category}`);
    const allLevelWords = Object.values(levels.categories).flat() as Array<{
      id: string;
    }>;

    const freeLevelPreviewIds = allLevelWords
      .slice(0, FREE_LEVEL_WORD_LIMIT)
      .map((w) => w.id);

    if (freeLevelPreviewIds.includes(id)) {
      return;
    }

    return navigateTo("/upgrade");
  }

  // topic route
  const hasPaidAccess =
    entitlement.value?.plan === "monthly" ||
    entitlement.value?.plan === "yearly";

  if (hasPaidAccess) {
    return;
  }

  const topic = await $fetch(`/api/index/topics/${category}`);
  const allTopicWords = Object.values(topic.categories).flat() as Array<{
    id: string;
  }>;

  const freeTopicPreviewIds = allTopicWords
    .slice(0, FREE_WORD_LIMIT)
    .map((w) => w.id);

  if (freeTopicPreviewIds.includes(id)) {
    return;
  }

  return navigateTo("/upgrade");
});
