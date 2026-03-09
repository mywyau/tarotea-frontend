import { hasPaidAccess } from "@/utils/paidAccess";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const { authReady, isLoggedIn, entitlement, resolve } = useMeStateV2();

  await resolve();

  if (!isLoggedIn) {
    return navigateTo("/please-sign-in");
  }

  // Full paid access
  if (hasPaidAccess(entitlement.value)) {
    return;
  }

  return navigateTo("/upgrade");
});
