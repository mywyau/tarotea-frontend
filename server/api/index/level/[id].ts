export default defineEventHandler(async (event) => {
  
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  const cdnBase = useRuntimeConfig().public.cdnBase;
  console.log("CDN (runtime):", useRuntimeConfig().public.cdnBase)

  try {
    return await $fetch(
      `${cdnBase}/index/level/${id}.json`
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Level not found",
    });
  }
});
