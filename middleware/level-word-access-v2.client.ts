import { isLevelId } from "@/utils/levels/levels";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const slug = to.params.slug as string | undefined;
  const id = to.params.id as string | undefined;

  if (!slug || !id) return;

  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  try {
    const { getAccessToken } = await useAuth();
    const token = await getAccessToken();

    const access = await $fetch<{
      isComingSoon: boolean;
      hasFullAccess: boolean;
      freePreviewIds: string[];
      unlockedWordIds: string[];
    }>(`/api/access/level/${slug}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (access.isComingSoon) {
      return navigateTo("/coming-soon");
    }

    if (access.hasFullAccess) {
      return;
    }

    if (access.freePreviewIds.includes(id)) {
      return;
    }

    if (access.unlockedWordIds.includes(id)) {
      return;
    }

    return navigateTo(`/level/${slug}/unlock/${id}`);
  } catch {
    // Fallback for logged-out users or access endpoint auth failures
    const access = await $fetch<{
      isComingSoon: boolean;
      hasFullAccess: boolean;
      freePreviewIds: string[];
      unlockedWordIds: string[];
    }>(`/api/access/level/${slug}`);

    if (access.isComingSoon) {
      return navigateTo("/coming-soon");
    }

    if (access.hasFullAccess) {
      return;
    }

    if (access.freePreviewIds.includes(id)) {
      return;
    }

    if (access.unlockedWordIds.includes(id)) {
      return;
    }

    return navigateTo("/upgrade");
  }
});
