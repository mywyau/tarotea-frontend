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
    return await $fetch(
      `${cdnBase}/topics/${id}.json`
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }
});
