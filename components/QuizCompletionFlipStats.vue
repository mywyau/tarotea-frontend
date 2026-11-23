<script setup lang="ts">
import { CheckCircle2, CircleX, Clock3, TrendingDown, TrendingUp } from '@lucide/vue'

const props = withDefaults(defineProps<{
  correct: number | string
  incorrect: number | string
  time: number | string
  correctLabel?: string
  incorrectLabel?: string
  xpEarned?: number | string
  xpLost?: number | string
  showScore?: boolean
  showXp?: boolean
  showXpLost?: boolean
}>(), {
  xpEarned: 0,
  xpLost: 0,
  showScore: true,
  showXp: true,
  showXpLost: true,
  correctLabel: 'Correct',
  incorrectLabel: 'Incorrect',
})

const stats = computed(() => [
  ...(props.showScore ? [
    { label: props.correctLabel, value: props.correct, icon: CheckCircle2, tone: 'success' },
    { label: props.incorrectLabel, value: props.incorrect, icon: CircleX, tone: 'error' },
  ] : []),
  ...(props.showXp ? [
    { label: 'XP earned', value: `+${Number(props.xpEarned) || 0} XP`, icon: TrendingUp, tone: 'success' },
  ] : []),
  ...(props.showXp && props.showXpLost ? [
    { label: 'XP lost', value: `-${Number(props.xpLost) || 0} XP`, icon: TrendingDown, tone: 'error' },
  ] : []),
  { label: 'Time', value: props.time, icon: Clock3, tone: 'neutral' },
])

onMounted(() => {
  requestAnimationFrame(() => {
    document.querySelector('.quiz-completion')?.scrollIntoView({ block: 'start' })
  })
})
</script>

<template>
  <dl class="completion-stat-grid" aria-label="Quiz completion stats">
    <div v-for="stat in stats" :key="stat.label" class="completion-stat" :class="`is-${stat.tone}`">
      <dt>
        <component :is="stat.icon" aria-hidden="true" />
        <span>{{ stat.label }}</span>
      </dt>
      <dd>{{ stat.value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.completion-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.completion-stat {
  min-width: 0;
  padding-block: 0.5rem;
  text-align: left;
}

.completion-stat:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}

.completion-stat dt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: rgb(var(--color-muted));
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.completion-stat svg {
  width: 1rem;
  height: 1rem;
}

.completion-stat dd {
  margin: 0.45rem 0 0;
  color: rgb(var(--color-ink));
  font-size: clamp(1.15rem, 4vw, 1.45rem);
  font-weight: 700;
  line-height: 1;
}

.completion-stat.is-success svg { color: rgb(var(--color-success)); }
.completion-stat.is-error svg { color: rgb(var(--color-error)); }
.completion-stat.is-neutral svg { color: rgb(var(--color-primary)); }

@media (min-width: 640px) {
  .completion-stat-grid { grid-template-columns: repeat(v-bind('stats.length'), minmax(0, 1fr)); }
  .completion-stat:last-child:nth-child(odd) { grid-column: auto; }
}
</style>
