// server/api/daily/jyutping/words/[id].get.ts
import { createError, getRouterParam } from "h3";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig(event);

  try {
    return await $fetch(`${cdnBase}/words/${encodeURIComponent(id)}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }
});