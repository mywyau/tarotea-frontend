import { getUserFromSession } from "@/server/utils/auth";
import { getRouterParam, createError } from "h3";

const FREE_TOPICS = new Set([
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
]);

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  // ✅ Allow free topics immediately
  if (!FREE_TOPICS.has(id)) {
    const user = await getUserFromSession(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const hasPaidAccess =
      user.plan !== "free" &&
      ["active", "trialing", "past_due"].includes(
        user.subscriptionStatus ?? ""
      );

    if (!hasPaidAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: "Topic locked",
      });
    }
  }

  const cdnBase = useRuntimeConfig().public.cdnBase;

  try {
    return await $fetch(`${cdnBase}/topics/${id}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }
});
