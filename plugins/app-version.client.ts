export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:manifest:update', () => {
    reloadNuxtApp({
      ttl: 10000,
      persistState: false,
    })
  })
})


