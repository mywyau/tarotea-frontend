import {
  levelIdToNumbers,
  isLevelId
} from "@/utils/levels/levels";

export default defineNuxtRouteMiddleware(async (to) => {
  const slug = to.params.slug as string | undefined;
  const id = to.params.id as string | undefined;

  if (!slug || !id) return;

  const { authReady, isLoggedIn, entitlement } = useMeStateV2();
  if (!authReady.value) return;

  // ✅ Validate slug
  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber = levelIdToNumbers(slug);

  // ✅ Free levels
  if (levelNumber <= 3) return;

  // 🚧 Coming soon
  if (levelNumber > 11) {
    return navigateTo("/coming-soon");
  }

  // ✅ Paid users → full access
  if (
    isLoggedIn.value &&
    entitlement.value &&
    canAccessLevel(entitlement.value)
  ) {
    return;
  }

  // 🔓 Free preview logic (first 10 words)

  const levels = await $fetch(`/api/index/levels/${slug}`);

  const allWords = Object.values(levels.categories).flat();
  const freePreviewIds = allWords.slice(0, 10).map((w: any) => w.id);

  if (freePreviewIds.includes(id)) return;

  return navigateTo("/upgrade");
});