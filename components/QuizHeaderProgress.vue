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

const progress = computed(() => {
  if (!props.total) return 0
  return Math.min(100, Math.max(0, Math.round((props.current / props.total) * 100)))
})

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
  <ClientOnly>
    <Teleport to="#quiz-header-progress">
      <div class="quiz-header-progress-content" aria-label="Quiz progress">
        <span v-if="label" class="quiz-header-progress-label">{{ label }}</span>
        <div class="quiz-header-progress-track" role="progressbar" aria-label="Quiz progress"
          :aria-valuemin="0" :aria-valuemax="total" :aria-valuenow="current">
          <span :style="{ width: `${progress}%` }" />
        </div>
        <span class="quiz-header-progress-count">{{ current }} / {{ total }}</span>
        <button type="button" class="quiz-auto-toggle" role="switch" :aria-checked="autoAdvance"
          aria-label="Automatically advance to the next question"
          :title="`Advance ${advanceDelayMs / 1000} seconds after answering`"
          @click="autoAdvance = !autoAdvance">
          Auto {{ autoAdvance ? 'on' : 'off' }}<span v-if="sentenceQuiz && autoAdvance"> · {{ advanceDelayMs / 1000 }}s</span>
        </button>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.quiz-header-progress-content {
  display: grid;
  width: min(19rem, 100%);
  grid-template-columns: minmax(0, auto) 1fr auto;
  align-items: center;
  gap: 0.25rem 0.55rem;
}

.quiz-header-progress-track {
  grid-column: 1 / -1;
  grid-row: 2;
  height: 0.42rem;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(var(--color-ink) / 0.1);
}

.quiz-header-progress-label {
  max-width: 7rem;
  overflow: hidden;
  color: rgb(var(--color-ink));
  font-size: 0.72rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quiz-header-progress-count {
  justify-self: end;
}

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

@media (max-width: 479px) {
  .quiz-header-progress-content { gap: 0.2rem 0.35rem; }
  .quiz-header-progress-label { max-width: 4.2rem; font-size: 0.65rem; }
  .quiz-header-progress-count { font-size: 0.65rem; }
}

.quiz-header-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(var(--color-primary));
  transition: width var(--motion-panel) ease;
}

.quiz-header-progress-count {
  flex: 0 0 auto;
  color: rgb(var(--color-muted));
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}
</style>
