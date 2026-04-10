import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { isComingSoon, isFreeLevel } from "~/utils/levels/permissions";
import { freeTopics } from "~/utils/topics/permissions";

function hasPaidAccess(entitlement: { plan?: string | null } | null | undefined) {
  return entitlement?.plan === "monthly" || entitlement?.plan === "yearly";
}

async function getUnlockedWordIds() {
  const unlockedIds = useState<string[]>("unlocked-word-ids", () => []);
  const loaded = useState<boolean>("unlocked-word-ids-loaded", () => false);

  if (!loaded.value) {
    try {
      // Swap this to whatever endpoint you added for unlocked words
      const res = await $fetch<{ wordIds: string[] }>("/api/account/unlocked-words");
      unlockedIds.value = res.wordIds ?? [];
    } catch {
      unlockedIds.value = [];
    } finally {
      loaded.value = true;
    }
  }

  return unlockedIds.value;
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const category = to.params.category as string | undefined;
  const id = to.params.id as string | undefined;

  if (!category || !id) return;

  const { entitlement, resolve } = useMeStateV2();
  await resolve();

  const paid = hasPaidAccess(entitlement.value);

  if (isLevelId(category)) {
    const levelNumber = levelIdToNumbers(category);

    if (isComingSoon(levelNumber)) {
      return navigateTo("/coming-soon");
    }

    if (paid || isFreeLevel(levelNumber)) {
      return;
    }

    const unlockedIds = await getUnlockedWordIds();
    if (unlockedIds.includes(id)) {
      return;
    }

    const level = await $fetch(`/api/index/levels/${category}`);
    const allLevelWords = Object.values(level.categories).flat() as Array<{ id: string }>;

    const freeLevelPreviewIds = allLevelWords
      .slice(0, FREE_LEVEL_WORD_LIMIT)
      .map((w) => w.id);

    if (freeLevelPreviewIds.includes(id)) {
      return;
    }

    return navigateTo("/upgrade");
  }

  if (paid || freeTopics.has(category)) {
    return;
  }

  const unlockedIds = await getUnlockedWordIds();
  if (unlockedIds.includes(id)) {
    return;
  }

  const topic = await $fetch(`/api/index/topics/${category}`);
  const allTopicWords = Object.values(topic.categories).flat() as Array<{ id: string }>;

  const freeTopicPreviewIds = allTopicWords
    .slice(0, FREE_WORD_LIMIT)
    .map((w) => w.id);

  if (freeTopicPreviewIds.includes(id)) {
    return;
  }

  return navigateTo("/upgrade");
});