export default defineNuxtPlugin(() => {
  const currentVersion = import.meta.env.NUXT_PUBLIC_BUILD_ID

  window.addEventListener('focus', async () => {
    const res = await fetch('/build-id.json', { cache: 'no-store' })
    const { buildId } = await res.json()

    if (buildId !== currentVersion) {
      window.location.reload()
    }
  })
})