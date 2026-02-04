export default defineNuxtPlugin(async () => {
  const me = useMeStateV2()
  await me.resolve()
})
