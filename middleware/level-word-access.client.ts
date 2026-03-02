import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import {
  canAccessLevelWord,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

// import { until } from "@vueuse/core";

// http://localhost:3000/level/level-seven/word/ngo5gin3ji3-i-suggest

export default defineNuxtRouteMiddleware(async (to) => {

  if (process.server) return; // middleware runs on client only

  const slug = to.params.slug as string;
  const id = to.params.id as string;

  if (!slug || !id) return;

  const { authReady, isLoggedIn, entitlement, resolve } = useMeStateV2();

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

  // Free preview (first 10 words)
  const levels = await $fetch(`/api/index/levels/${slug}`);
  const allWords = Object.values(levels.categories).flat();
  const freePreviewIds = allWords.slice(0, 10).map((w: any) => w.id);

  if (freePreviewIds.includes(id)) return;

  // Final fallback
  return navigateTo("/upgrade");
});
