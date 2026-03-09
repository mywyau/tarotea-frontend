import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { hasPaidAccess } from "@/utils/paidAccess";

export default defineNuxtRouteMiddleware(async (to) => {

  if (process.server) return; // middleware runs on client only

  // if (!slug || !id) return;

  const { authReady, isLoggedIn, entitlement, resolve } = useMeStateV2();

  await resolve();

  // Full paid access
  if (hasPaidAccess(entitlement.value)) {
    return;
  }

  return navigateTo("/upgrade");
});
