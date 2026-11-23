<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  current: number
  total: number
  completed?: number
  progressLabel?: string
}>(), { progressLabel: 'Quiz progress' })

const value = computed(() => props.completed ?? props.current)
const progress = computed(() => props.total ? Math.min(100, Math.max(0, 100 * value.value / props.total)) : 0)
</script>

<template>
  <ClientOnly>
    <Teleport to="#quiz-header-progress">
      <div class="quiz-header-progress-content" :aria-label="progressLabel">
        <span v-if="label" class="quiz-header-progress-label">{{ label }}</span>
        <div class="quiz-header-progress-track" role="progressbar" :aria-label="progressLabel"
          :aria-valuemin="0" :aria-valuemax="total" :aria-valuenow="value">
          <span :style="{ width: `${progress}%` }" />
        </div>
        <span class="quiz-header-progress-count">{{ current }} / {{ total }}</span>
        <slot />
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
