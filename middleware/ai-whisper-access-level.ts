import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels";
import {
  canAccessLevelWord,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

// http://localhost:3000/level/level-ten/word/si4gwo3ging2cin1-times-change

// http://localhost:3000/echo-lab/pronunciation-check/level-ten/sentences/si4gwo3ging2cin1-times-change/0

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const levelSlug = to.params.level as string | undefined;
  const wordSlug = to.params.word as string;

  if (!levelSlug || !wordSlug) return;

  if (!levelSlug) return;
  // ✅ Type guard
  if (!isLevelId(levelSlug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber: number = levelIdToNumbers(levelSlug);

  const { authReady, isLoggedIn, entitlement, resolve } = useMeStateV2();

  await resolve();

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
  const levels = await $fetch(`/api/index/levels/${levelSlug}`);
  const allWords = Object.values(levels.categories).flat();
  const freePreviewIds = allWords.slice(0, 10).map((w: any) => w.id);

  if (freePreviewIds.includes(wordSlug)) return;

  // Final fallback
  return navigateTo("/upgrade");
});
