import { computed, onBeforeUnmount, ref } from 'vue'

export function useQuizTimer() {
  const quizStartedAt = ref<number | null>(null)
  const elapsedMs = ref(0)
  const frozenElapsedMs = ref<number | null>(null)

  let timerInterval: ReturnType<typeof setInterval> | null = null

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function startTimer() {
    stopTimer()
    quizStartedAt.value = Date.now()
    elapsedMs.value = 0
    frozenElapsedMs.value = null

    timerInterval = setInterval(() => {
      if (quizStartedAt.value !== null) {
        elapsedMs.value = Date.now() - quizStartedAt.value
      }
    }, 250)
  }

  function freezeTimer() {
    if (quizStartedAt.value === null) return

    const finalMs = Date.now() - quizStartedAt.value
    elapsedMs.value = finalMs
    frozenElapsedMs.value = finalMs
    stopTimer()
  }

  function resetTimer() {
    stopTimer()
    quizStartedAt.value = null
    elapsedMs.value = 0
    frozenElapsedMs.value = null
  }

  function formatDuration(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const displayedElapsedMs = computed(() => frozenElapsedMs.value ?? elapsedMs.value)
  const formattedElapsedTime = computed(() => formatDuration(displayedElapsedMs.value))

  onBeforeUnmount(() => {
    stopTimer()
  })

  return {
    elapsedMs,
    frozenElapsedMs,
    quizStartedAt,
    displayedElapsedMs,
    formattedElapsedTime,
    stopTimer,
    startTimer,
    freezeTimer,
    resetTimer,
  }
}
