export default defineNuxtRouteMiddleware(async (to) => {

  const slug = to.params.slug as string | undefined;
  const id = to.params.id as string | undefined;

  if (!slug || !id) return;

  const {
    authReady,
    isLoggedIn,
    entitlement,
  } = useMeStateV2();

  if (!authReady.value) return;

  const levelNumber = getLevelNumber(slug);
  if (!levelNumber) {
    throw createError({ statusCode: 404 });
  }

  // ✅ Free levels (1–2)
  if (levelNumber <= 2) return;

  // 🚧 Coming soon
  if (levelNumber > 5) {
    return navigateTo("/coming-soon");
  }

  // ✅ Paid users → full access
  if (isLoggedIn.value && entitlement.value && canAccessLevel(entitlement.value)) {
    return;
  }

  // 🔓 Free preview logic (first 5 words only)

  // Fetch level data
  const topic = await $fetch(`/api/index/levels/${slug}`);

  const allWords = Object.values(topic.categories).flat();
  const freePreviewIds = allWords.slice(0, 5).map((w: any) => w.id);

  if (freePreviewIds.includes(id)) {
    return; // allow preview
  }

  // Otherwise block
  return navigateTo("/upgrade");
});