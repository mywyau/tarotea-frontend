import { canAccessTopic, freeTopics } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  const topicSlug = to.params.topic as string | undefined;
  const wordId = to.params.slug as string | undefined;

  if (!topicSlug || !wordId) return;

  const { authReady, isLoggedIn, entitlement } = useMeStateV2();

  if (!authReady.value) return;

  // ✅ Fully free topics
  if (freeTopics.has(topicSlug)) {
    return;
  }

  // ✅ Paid users → full access
  if (canAccessTopic(isLoggedIn.value, entitlement.value, topicSlug)) {
    return;
  }

  // 🔓 Free preview logic (first 10 words only)

  const topic = await $fetch(`/api/index/topics/${topicSlug}`);

  const allWords = Object.values(topic.categories).flat();
  const freePreviewIds = allWords.slice(0, 10).map((w: any) => w.id);

  if (freePreviewIds.includes(wordId)) {
    return; // allow preview
  }

  // ❌ Otherwise block
  return navigateTo("/upgrade");
});
