import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { isComingSoon } from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const slug = to.params.slug as string;

  if (!slug) return;

  const { isLoggedOut, entitlement, resolve } = useMeStateV2();

  await resolve();

  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber: number = levelIdToNumbers(slug);
  const isGuestPreviewRoute =
    to.path.includes("/sentences/") ||
    to.path.includes("/word/") ||
    to.path.includes("/audio/");

  if (isLoggedOut.value) {
    if (isGuestPreviewRoute) {
      return;
    }
    return navigateTo("/please-sign-in");
  }

  // Coming soon
  if (isComingSoon(levelNumber)) {
    return navigateTo("/coming-soon");
  }

  // Final fallback
  // return navigateTo("/upgrade");
  return;
});
