import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/levels-config";
import {
  canAccessLevelWord,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware(async (to) => {

  if (process.server) return; // middleware runs on client only

  const word = to.params.word as string;
  const idx = to.params.id as string;

  if (!word || !idx) return;

  const { entitlement, resolve } = useMeStateV2();

  await resolve();

  if (!isLevelId(word)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber = levelIdToNumbers(word);

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
  const levels = await $fetch(`/api/index/levels/${word}`);
  const allWords = Object.values(levels.categories).flat();
  const freePreviewIds = allWords
    .slice(0, FREE_LEVEL_WORD_LIMIT)
    .map((w: any) => w.id);

  if (freePreviewIds.includes(id)) return;

  // Final fallback
  return navigateTo("/upgrade");
});
