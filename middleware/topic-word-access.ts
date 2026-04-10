import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const topicSlug = to.params.topic as string | undefined;
  const wordIdSlug = to.params.slug as string | undefined;

  if (!topicSlug || !wordIdSlug) return;

  const { isLoggedIn, entitlement, resolve } = useMeStateV2();
  await resolve();

  // Fully free topics
  if (freeTopics.has(topicSlug)) {
    return;
  }

  // Paid users get full access
  if (canAccessTopicWord(isLoggedIn.value, entitlement.value, topicSlug)) {
    return;
  }

  // Free preview logic
  const topic = await $fetch(`/api/index/topics/${topicSlug}`);
  const allWords = Object.values(topic.categories).flat() as Array<{ id: string }>;
  const freePreviewIds = allWords
    .slice(0, FREE_WORD_LIMIT)
    .map((w) => w.id);

  if (freePreviewIds.includes(wordIdSlug)) {
    return;
  }

  // Individually unlocked premium word
  if (isLoggedIn.value) {
    try {
      const { getAccessToken } = await useAuth();
      const token = await getAccessToken();

      const result = await $fetch<{
        unlockedWordIds: string[];
      }>("/api/word-unlocks", {
        query: { wordIds: wordIdSlug },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.unlockedWordIds.includes(wordIdSlug)) {
        return;
      }
    } catch {
      // ignore and fall through
    }
  }

  // Better UX than sending them straight to upgrade
  return navigateTo(`/topic/${topicSlug}/unlock/${wordIdSlug}`);
});