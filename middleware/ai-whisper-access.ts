import { hasPaidAccess } from "@/utils/paidAccess";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const { authReady, isLoggedIn, isLoggedOut, entitlement, resolve } =
    useMeStateV2();

  await resolve();

  if (isLoggedOut.value) {
    return navigateTo("/please-sign-in");
  }

  if (!isLoggedIn.value) {
    return resolve();
  }

  // Full paid access
  if (hasPaidAccess(entitlement.value)) {
    return;
  }

  return navigateTo("/upgrade");
});
