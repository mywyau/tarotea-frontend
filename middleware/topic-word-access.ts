export default defineNuxtRouteMiddleware(async (to) => {
  const topicSlug = to.params.topic as string | undefined;
  const wordId = to.params.slug as string | undefined;

  if (!topicSlug || !wordId) return;

  const {
    authReady,
    isLoggedIn,
    entitlement,
  } = useMeStateV2();

  if (!authReady.value) return;

  const FREE_TOPICS = [
    "survival-essentials",
    "greetings-polite",
    "fruits-vegetables",
    "clothing",
  ];

  // ✅ Fully free topics
  if (FREE_TOPICS.includes(topicSlug)) {
    return;
  }

  // ✅ Paid users → full access
  if (isLoggedIn.value && entitlement.value && canAccessLevel(entitlement.value)) {
    return;
  }

  // 🔓 Free preview logic (first 5 words only)

  const topic = await $fetch(`/api/index/topics/${topicSlug}`);

  const allWords = Object.values(topic.categories).flat();
  const freePreviewIds = allWords.slice(0, 5).map((w: any) => w.id);

  if (freePreviewIds.includes(wordId)) {
    return; // allow preview
  }

  // ❌ Otherwise block
  return navigateTo("/upgrade");
});