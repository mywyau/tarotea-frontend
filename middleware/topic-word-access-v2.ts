
export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const topicSlug = to.params.topic as string | undefined;
  const wordIdSlug = to.params.slug as string | undefined;

  if (!topicSlug || !wordIdSlug) return;

  try {
    const { getAccessToken } = await useAuth();
    const token = await getAccessToken();

    const access = await $fetch<{
      isFree: boolean;
      hasFullAccess: boolean;
      freePreviewIds: string[];
      unlockedWordIds: string[];
    }>(`/api/access/topic/${topicSlug}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (access.isFree) {
      return;
    }

    if (access.hasFullAccess) {
      return;
    }

    if (access.freePreviewIds.includes(wordIdSlug)) {
      return;
    }

    if (access.unlockedWordIds.includes(wordIdSlug)) {
      return;
    }

    return navigateTo(`/topic/${topicSlug}/unlock/${wordIdSlug}`);
  } catch {
    // fallback for logged-out users / no token
    const access = await $fetch<{
      isFree: boolean;
      hasFullAccess: boolean;
      freePreviewIds: string[];
      unlockedWordIds: string[];
    }>(`/api/access/topic/${topicSlug}`);

    if (access.isFree) {
      return;
    }

    if (access.hasFullAccess) {
      return;
    }

    if (access.freePreviewIds.includes(wordIdSlug)) {
      return;
    }

    if (access.unlockedWordIds.includes(wordIdSlug)) {
      return;
    }

    return navigateTo(`/topic/${topicSlug}/unlock/${wordIdSlug}`);
  }
});
