export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  console.log("Word API called", {
    id,
    time: new Date().toISOString(),
  });

  if (!id) {
    console.warn("Missing word id");
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {
    const word = await $fetch(`${cdnBase}/words/${id}.json`);

    console.log("Word served successfully", { id });

    return word;
  } catch (err) {
    console.error("Word not found", { id });

    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }
});
