export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const { public: { cdnBase } } = useRuntimeConfig();

  console.log(`${cdnBase}/content/cantonese/words/level/level-two/${id}.json`)

  try {
    return await $fetch(
      `${cdnBase}/content/cantonese/words/level/level-two/${id}.json`
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }
});


