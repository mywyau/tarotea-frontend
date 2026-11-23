<script setup lang="ts">
const props = defineProps<{
  current: number
  total: number
  label?: string
  answered?: boolean
  sentenceQuiz?: boolean
}>()

const emit = defineEmits<{ advance: [] }>()
const AUTO_ADVANCE_DELAY_MS = 2500
const advanceDelayMs = props.sentenceQuiz ? 8000 : AUTO_ADVANCE_DELAY_MS
const autoAdvance = props.sentenceQuiz ? ref(false) : useCookie<boolean>('quiz-auto-advance', {
  default: () => false,
  sameSite: 'lax',
})
let advanceTimer: ReturnType<typeof setTimeout> | undefined

function clearAdvanceTimer() {
  if (!advanceTimer) return
  clearTimeout(advanceTimer)
  advanceTimer = undefined
}

watch([() => props.answered, autoAdvance], ([answered, automatic]) => {
  clearAdvanceTimer()
  if (!answered || !automatic) return

  advanceTimer = setTimeout(() => emit('advance'), advanceDelayMs)
})

onBeforeUnmount(clearAdvanceTimer)
</script>

<template>
  <PracticeHeaderProgress :label="label" :current="current" :total="total">
    <button type="button" class="quiz-auto-toggle" role="switch" :aria-checked="autoAdvance"
      aria-label="Automatically advance to the next question"
      :title="`Advance ${advanceDelayMs / 1000} seconds after answering`"
      @click="autoAdvance = !autoAdvance">
      Auto {{ autoAdvance ? 'on' : 'off' }}<span v-if="sentenceQuiz && autoAdvance"> · {{ advanceDelayMs / 1000 }}s</span>
    </button>
  </PracticeHeaderProgress>
</template>

<style scoped>
.quiz-auto-toggle {
  min-height: 1.75rem;
  border-radius: 999px;
  padding: 0.25rem 0.45rem;
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-muted));
  font-size: 0.62rem;
  font-weight: 700;
  white-space: nowrap;
}

.quiz-auto-toggle[aria-checked='true'] {
  background: rgb(var(--color-taro-pink) / 0.38);
  color: rgb(var(--color-primary-strong));
}
</style>
