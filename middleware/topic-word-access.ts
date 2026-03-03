import {
  canAccessTopic,
  canAccessTopicWord,
  freeTopics,
} from "~/utils/topics/permissions";

// http://localhost:3000/topic/word/dim-sum/haa1coeng4fan2-shrimp-rice-noodle-roll

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topicSlug = to.params.topic as string | undefined;
  const wordIdSlug = to.params.slug as string | undefined;

  if (!topicSlug || !wordIdSlug) return;

  const { authReady, isLoggedIn, entitlement, resolve } = useMeStateV2();

  await resolve();

  // ✅ Fully free topics
  // if (freeTopics.has(topicSlug)) {
  //   return;
  // }

  // ✅ Paid users → full access
  if (canAccessTopicWord(isLoggedIn.value, entitlement.value, topicSlug)) {
    return;
  }

  // 🔓 Free preview logic (first 10 words only)

  const topic = await $fetch(`/api/index/topics/${topicSlug}`);

  const allWords = Object.values(topic.categories).flat();
  const freePreviewIds = allWords.slice(0, 10).map((w: any) => w.id);

  if (freePreviewIds.includes(wordIdSlug)) {
    return; // allow preview
  }

  // ❌ Otherwise block
  return navigateTo("/upgrade");
});
