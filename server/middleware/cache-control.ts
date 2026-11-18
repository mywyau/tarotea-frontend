import { defineEventHandler, getRequestURL } from "h3";
import { applyPrivateApiCacheControl } from "~/server/utils/cacheControl";

export default defineEventHandler((event) => {
  if (getRequestURL(event).pathname.startsWith("/api/")) {
    applyPrivateApiCacheControl(event);
  }
});
