import { applyPublicContentCacheControl } from "~/server/utils/cacheControl";

export default defineEventHandler(async (event) => {
  
  const cdnBase = useRuntimeConfig().public.cdnBase;

  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  try {
    const content = await $fetch(`${cdnBase}/levels/${id}.json`);
    applyPublicContentCacheControl(event);
    return content;
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Level not found",
    });
  }
});
