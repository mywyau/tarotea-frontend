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

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  const categoryParam =
    firstParam(to.params.category as string | string[] | undefined) ??
    firstParam(to.params.topic as string | string[] | undefined) ??
    firstParam(to.params.slug as string | string[] | undefined);

  const wordIdParam =
    firstParam(to.params.id as string | string[] | undefined) ??
    firstParam(to.params.wordId as string | string[] | undefined) ??
    (to.params.topic
      ? firstParam(to.params.slug as string | string[] | undefined)
      : undefined);

  const category = categoryParam ? decodeURIComponent(categoryParam) : undefined;
  const id = wordIdParam ? decodeURIComponent(wordIdParam) : undefined;

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
