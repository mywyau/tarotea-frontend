export default defineNuxtRouteMiddleware((to) => {
  if (!/^\/daily(?:\/|$)/i.test(to.path) || useRuntimeConfig().public.dailyPracticeEnabled) return

  return navigateTo('/feature-unavailable?feature=daily', { replace: true })
})
