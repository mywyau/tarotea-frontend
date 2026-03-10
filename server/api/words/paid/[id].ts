export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  await requirePaidUser(userId); // 🔒 block free users
  const id = getRouterParam(event, "id");

  console.log("[Paid] Word API called", { id, time: new Date().toISOString() });

  if (!id) {
    console.warn("Missing word id");
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {
    const word = await $fetch(`${cdnBase}/words/${id}.json`);

    console.log("[Paid] Word served successfully", { id });

    return word;
  } catch (err) {
    console.error("[Paid] Word not found", { id });

    throw createError({
      statusCode: 404,
      statusMessage: "[Paid] Word not found",
    });
  }
});
