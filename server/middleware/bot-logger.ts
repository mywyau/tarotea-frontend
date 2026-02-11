import { defineEventHandler, getHeader, getRequestURL } from "h3";

const BOT_REGEX =
  /bot|crawler|spider|crawling|curl|wget|python|scrapy|httpclient|monitoring/i;

export default defineEventHandler((event) => {
  const userAgent = getHeader(event, "user-agent") || "";
  const url = getRequestURL(event);

  const isBot = BOT_REGEX.test(userAgent);

  // Ignore static assets
  if (
    url.pathname.startsWith("/_nuxt") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/icons")
  ) {
    return;
  }

  // Only log bots
  if (isBot) {
    console.log(
      JSON.stringify({
        event: "bot_request",
        path: url.pathname,
        userAgent,
        timestamp: new Date().toISOString(),
      })
    );
  }
});
