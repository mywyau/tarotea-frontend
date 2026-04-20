export default defineNuxtRouteMiddleware(async () => {
  if (process.server) return

  const { isLoggedOut, entitlement, resolve } = useMeStateV2()

  await resolve()

  if (isLoggedOut.value) {
    return navigateTo("/please-sign-in")
  }

  const hasPaidAccess =
    (entitlement.value?.plan === "monthly" ||
      entitlement.value?.plan === "yearly") &&
    entitlement.value?.subscription_status === "active"

  if (hasPaidAccess) return

  return navigateTo("/upgrade")
})
