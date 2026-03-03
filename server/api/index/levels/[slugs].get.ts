// import levelData from "@/server/api/index/levels/[id]";
import { createError, getHeader, getRouterParam } from "h3";
import { db } from "~/server/db";
import { isLevelId, levelIdToNumberMap } from "~/utils/levels/levels";
import { isFreeLevel } from "~/utils/levels/permissions";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing level slug",
    });
  }

  // ✅ Validate slug (type guard)
  if (!isLevelId(slug)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Level not found",
    });
  }

  const levelNumber = levelIdToNumberMap[slug];

  // ✅ Free levels
  if (isFreeLevel(levelNumber)) {
    return await $fetch(`/api/index/levels/${slug}`);
  }

  // 🔒 Require user
  const userId = getHeader(event, "x-user-id");
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Sign in required",
    });
  }

  // 🔒 Fetch entitlement
  const { rows } = await db.query(
    `select plan, subscription_plan 
     from entitlements 
     where user_id = $1`,
    [userId],
  );

  const ent = rows[0];

  const isSubscribed =
    ent?.subscription_plan === "active" &&
    (ent?.plan === "monthly" || ent?.plan === "yearly");

  if (!isSubscribed) {
    throw createError({
      statusCode: 403,
      statusMessage: "Subscription Upgrade required",
    });
  }

  return await $fetch(`/api/index/levels/${slug}`);
});
