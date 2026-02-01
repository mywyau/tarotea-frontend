export default defineNuxtRouteMiddleware(() => {
  const { authReady, me } = useMeState()

  if (!authReady.value) return
  if (!me.value) return navigateTo('/login')
})
