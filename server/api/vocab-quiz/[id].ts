export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {
    return await $fetch(`${cdnBase}/vocab-quiz/${id}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "vocab-quiz set not found",
    });
  }
});
