export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  console.log("Vocab quiz requested", {
    id,
    timestamp: new Date().toISOString(),
  });

  if (!id) {
    console.warn("Missing vocab quiz id");
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {
    const quiz = await $fetch(`${cdnBase}/vocab-quiz/${id}.json`);

    console.log("Vocab quiz served successfully", { id });

    return quiz;
  } catch (err) {
    console.error("Vocab quiz not found", { id });

    throw createError({
      statusCode: 404,
      statusMessage: "vocab-quiz set not found",
    });
  }
});
