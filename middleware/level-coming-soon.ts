export default defineNuxtRouteMiddleware((to) => {
    
  const { me, authReady } = useMeState()

  if (!authReady.value) return

  const levelId = to.params.slug as string

  const comingSoonLevels = ['level-four', 'level-five']

  if (comingSoonLevels.includes(levelId)) {
    return navigateTo('/content-not-available')
  }

  // if (!me.value) {
  //   return navigateTo('/signin')
  // }
})
