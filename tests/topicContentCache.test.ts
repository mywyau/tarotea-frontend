import { describe, expect, it } from "vitest";
import {
  getTopicContentCacheKey,
  TOPIC_CONTENT_CACHE_TTL_SECONDS,
} from "../server/services/cache/topicContentCache";

describe("topic content cache policy", () => {
  it("uses a versioned namespace and bounded lifetime", () => {
    expect(getTopicContentCacheKey("survival-essentials")).toBe(
      "topic-content:v1:survival-essentials",
    );
    expect(TOPIC_CONTENT_CACHE_TTL_SECONDS).toBe(600);
  });
});
