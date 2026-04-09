import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import {
  canAccessLevelWord,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const slug = to.params.slug as string;
  const id = to.params.id as string;

  if (!slug || !id) return;

  const { entitlement, resolve, isLoggedIn } = useMeStateV2();

  await resolve();

  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber = levelIdToNumbers(slug);

  // Free levels
  if (isFreeLevel(levelNumber)) return;

  // Coming soon
  if (isComingSoon(levelNumber)) {
    return navigateTo("/coming-soon");
  }

  // Full paid access
  if (canAccessLevelWord(levelNumber, entitlement.value)) {
    return;
  }

  // Free preview
  const levels = await $fetch(`/api/index/levels/${slug}`);
  const allWords = Object.values(levels.categories).flat() as Array<{ id: string }>;
  const freePreviewIds = allWords
    .slice(0, FREE_LEVEL_WORD_LIMIT)
    .map((w) => w.id);

  if (freePreviewIds.includes(id)) return;

  // Individually unlocked word
  if (isLoggedIn.value) {
    try {
      const { getAccessToken } = await useAuth();
      const token = await getAccessToken();

      const result = await $fetch<{
        unlockedWordIds: string[];
      }>("/api/word-unlocks", {
        query: { wordIds: id },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (result.unlockedWordIds.includes(id)) {
        return;
      }
    } catch {
      // ignore and fall through to upgrade
    }
  }

  return navigateTo("/upgrade");
});