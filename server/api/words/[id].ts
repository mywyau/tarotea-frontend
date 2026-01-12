export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const { public: { cdnBase } } = useRuntimeConfig();

  console.log(`${cdnBase}/words/${id}.json`)

  try {
    return await $fetch(
      `${cdnBase}/words/${id}.json`
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }
});


