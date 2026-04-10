import { isLevelId } from "@/utils/levels/levels";

type LevelAccess = {
  isComingSoon: boolean;
  hasFullAccess: boolean;
  freePreviewIds: string[];
  unlockedWordIds: string[];
};

type TopicAccess = {
  isFree: boolean;
  hasFullAccess: boolean;
  freePreviewIds: string[];
  unlockedWordIds: string[];
};

async function getOptionalAuthHeaders() {
  try {
    const { getAccessToken } = await useAuth();
    const token = await getAccessToken();

    if (!token) return undefined;

    return {
      Authorization: `Bearer ${token}`,
    };
  } catch {
    return undefined;
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const category = to.params.category as string | undefined;
  const id = to.params.id as string | undefined;

  if (!category || !id) return;

  const headers = await getOptionalAuthHeaders();

  if (isLevelId(category)) {
    const access = await $fetch<LevelAccess>(`/api/access/level/${category}`, {
      headers,
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

    return navigateTo(`/level/${category}/unlock/${id}`);
  }

  const access = await $fetch<TopicAccess>(`/api/access/topic/${category}`, {
    headers,
  });

  if (access.isFree) {
    return;
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

  return navigateTo(`/topic/${category}/unlock/${id}`);
});