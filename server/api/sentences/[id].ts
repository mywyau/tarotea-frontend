export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {
    console.log(`${cdnBase}/sentences/${id}.json`)
    return await $fetch(`${cdnBase}/sentences/${id}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "sentence set not found",
    });
  }
});
