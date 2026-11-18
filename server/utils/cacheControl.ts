import { setHeader, type H3Event } from "h3";

export const PRIVATE_API_CACHE_CONTROL = "private, no-store";
export const PUBLIC_CONTENT_CACHE_CONTROL =
  "public, max-age=60, s-maxage=600, stale-while-revalidate=86400";

export function applyPrivateApiCacheControl(event: H3Event): void {
  setHeader(event, "Cache-Control", PRIVATE_API_CACHE_CONTROL);
}

export function applyPublicContentCacheControl(event: H3Event): void {
  setHeader(event, "Cache-Control", PUBLIC_CONTENT_CACHE_CONTROL);
}
