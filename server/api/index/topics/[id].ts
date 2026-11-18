import { applyPublicContentCacheControl } from "~/server/utils/cacheControl";

export default defineEventHandler(async (event) => {
  
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  const cdnBase = useRuntimeConfig().public.cdnBase;

  try {
    const content = await $fetch(
      `${cdnBase}/topics/${id}.json`
    );
    applyPublicContentCacheControl(event);
    return content;
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }
});
