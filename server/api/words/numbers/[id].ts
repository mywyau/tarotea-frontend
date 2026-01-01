export default defineEventHandler(async (event) => {
  // max-age=3600	                Browser caches for 1 hour
  // s-maxage=86400	              CDN caches for 24 hours
  // stale-while-revalidate=600	  Serve stale for 10 mins while updating

  const WORD_PATHS: Record<string, string> = {
    // units
    零: "units",
    一: "units",
    二: "units",
    三: "units",
    四: "units",
    五: "units",
    六: "units",
    七: "units",
    八: "units",
    九: "units",
    十: "units",

    // teens
    十一: "teens",
    十二: "teens",
    十三: "teens",
    十四: "teens",
    十五: "teens",
    十六: "teens",
    十七: "teens",
    十八: "teens",
    十九: "teens",

    // tens
    二十: "tens",
    三十: "tens",
    四十: "tens",
    五十: "tens",
    六十: "tens",
    七十: "tens",
    八十: "tens",
    九十: "tens",

    // beyond
    一百: "beyond",
    二百: "beyond",
    一千: "beyond",
    一萬: "beyond",
    十萬: "beyond",
    一百萬: "beyond",
  };

  setHeader(
    event,
    "cache-control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=600"
  );

  const id = getRouterParam(event, "id") || "no id or missing id";
  const origin = getRequestURL(event).origin;

  const folder = WORD_PATHS[id];

  if (!folder) {
    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }

  try {
    return await $fetch(`${origin}/content/cantonese/words/numbers/${folder}/${id}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }
});
