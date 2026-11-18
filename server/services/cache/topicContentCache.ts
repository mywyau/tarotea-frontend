const TOPIC_CONTENT_CACHE_VERSION = "v1";

export const TOPIC_CONTENT_CACHE_TTL_SECONDS = 60 * 10;

export function getTopicContentCacheKey(topicSlug: string): string {
  return `topic-content:${TOPIC_CONTENT_CACHE_VERSION}:${topicSlug}`;
}
