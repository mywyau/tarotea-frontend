export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  console.log("Topic quiz requested", {
    id,
    timestamp: new Date().toISOString(),
  });

  if (!id) {
    console.warn("Missing Topic quiz id");
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {

    console.log(`${cdnBase}/topics/${id}.json`)

    const quiz = await $fetch(`${cdnBase}/topics/${id}.json`);

    console.log("Topic quiz served successfully", { id });

    return quiz;
  } catch (err) {
    console.error("Topic quiz not found", { id });

    throw createError({
      statusCode: 404,
      statusMessage: "Topic-quiz set not found",
    });
  }
});
