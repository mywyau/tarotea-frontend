export function useXpAnimation() {
  const xpDelta = ref<number | null>(null)
  const mergingXp = ref(false)
  const readyForNext = ref(false)

  function triggerXp(delta: number, isLast: boolean) {
    xpDelta.value = delta
    readyForNext.value = false

    // 🔥 show Next almost immediately
    if (!isLast) {
      setTimeout(() => {
        readyForNext.value = true
      }, 250) // 0.25s instead of 1.2s
    }

    // animation continues independently
    setTimeout(() => {
      mergingXp.value = true

      setTimeout(() => {
        xpDelta.value = null
        mergingXp.value = false
      }, 800)
    }, 1000)
  }

  function reset() {
    xpDelta.value = null
    mergingXp.value = false
    readyForNext.value = false
  }

  return {
    xpDelta,
    mergingXp,
    readyForNext,
    triggerXp,
    reset
  }
}
