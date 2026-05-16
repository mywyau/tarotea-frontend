<script setup lang="ts">
const props = withDefaults(defineProps<{
  correct: number | string
  incorrect: number | string
  time: number | string
  correctLabel?: string
  incorrectLabel?: string
  xpEarned?: number | string
  xpLost?: number | string
  showXp?: boolean
}>(), {
  xpEarned: 0,
  xpLost: 0,
  showXp: true,
  correctLabel: 'Correct',
  incorrectLabel: 'Incorrect',
})

const showDetails = ref(false)

const numericCorrect = computed(() => Number(props.correct))
const numericIncorrect = computed(() => Number(props.incorrect))
const totalAnswered = computed(() => numericCorrect.value + numericIncorrect.value)

const accuracyLabel = computed(() => {
  if (!Number.isFinite(totalAnswered.value) || totalAnswered.value <= 0) return '0%'

  return `${Math.round((numericCorrect.value / totalAnswered.value) * 100)}%`
})

const formattedXpEarned = computed(() => {
  const value = Number(props.xpEarned)
  const prefix = Number.isFinite(value) && value > 0 ? '+' : ''

  return `${prefix}${props.xpEarned} XP`
})

const formattedXpLost = computed(() => {
  const value = Number(props.xpLost)
  const prefix = Number.isFinite(value) && value > 0 ? '-' : ''

  return `${prefix}${props.xpLost} XP`
})
</script>

<template>
  <section class="completion-summary" aria-label="Quiz completion summary">
    <p class="summary-kicker">
      Today’s progress
    </p>

    <div class="summary-line">
      <div v-if="showXp" class="summary-item summary-item-primary">
        <span class="summary-value">{{ formattedXpEarned }}</span>
        <span class="summary-label">earned</span>
      </div>

      <div class="summary-item">
        <span class="summary-value">{{ accuracyLabel }}</span>
        <span class="summary-label">accuracy</span>
      </div>

      <div class="summary-item">
        <span class="summary-value">{{ time }}</span>
        <span class="summary-label">time</span>
      </div>
    </div>

    <button
      type="button"
      class="details-toggle"
      :aria-expanded="showDetails"
      @click="showDetails = !showDetails"
    >
      {{ showDetails ? 'Hide breakdown' : 'View breakdown' }}
    </button>

    <transition name="details-reveal">
      <dl v-if="showDetails" class="details-list">
        <div class="details-row">
          <dt>{{ correctLabel }}</dt>
          <dd>{{ correct }}</dd>
        </div>

        <div class="details-row">
          <dt>{{ incorrectLabel }}</dt>
          <dd>{{ incorrect }}</dd>
        </div>

        <div v-if="showXp" class="details-row">
          <dt>XP lost</dt>
          <dd>{{ formattedXpLost }}</dd>
        </div>
      </dl>
    </transition>
  </section>
</template>

<style scoped>
.completion-summary {
  text-align: center;
}

.summary-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(17, 24, 39, 0.52);
}

.summary-line {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.4rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.summary-value {
  font-size: clamp(1.35rem, 5vw, 2rem);
  line-height: 1;
  font-weight: 700;
  color: #111827;
}

.summary-item-primary .summary-value {
  font-size: clamp(1.7rem, 6vw, 2.5rem);
}

.summary-label {
  font-size: 0.82rem;
  color: rgba(17, 24, 39, 0.55);
}

.details-toggle {
  margin-top: 1.75rem;
  border: 0;
  background: transparent;
  color: #111827;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.5rem 0;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.35rem;
}

.details-toggle:focus-visible {
  outline: 3px solid rgba(111, 92, 202, 0.35);
  outline-offset: 5px;
}

.details-list {
  display: grid;
  gap: 0.8rem;
  margin: 1.25rem auto 0;
  max-width: 24rem;
  text-align: left;
}

.details-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
}

.details-row dt {
  color: rgba(17, 24, 39, 0.56);
  font-size: 0.92rem;
}

.details-row dd {
  color: #111827;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.details-reveal-enter-active,
.details-reveal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.details-reveal-enter-from,
.details-reveal-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (min-width: 640px) {
  .summary-line {
    align-items: end;
    flex-direction: row;
    justify-content: center;
  }

  .summary-item {
    min-width: 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .details-reveal-enter-active,
  .details-reveal-leave-active {
    transition-duration: 1ms;
  }
}
</style>
