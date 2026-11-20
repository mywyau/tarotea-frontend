<script setup lang="ts">
withDefaults(defineProps<{
  retryTo: string
  backTo: string
  retryLabel?: string
  backLabel?: string
}>(), {
  retryLabel: 'Try again',
  backLabel: 'Choose another quiz',
})
</script>

<template>
  <div class="quiz-completion-actions">
    <AppButton :to="retryTo">{{ retryLabel }}</AppButton>
    <AppButton :to="backTo" variant="secondary">{{ backLabel }}</AppButton>
  </div>
</template>

<style scoped>
.quiz-completion-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.quiz-completion-actions :deep(a) { width: 100%; }

@media (max-width: 419px) {
  .quiz-completion-actions { grid-template-columns: 1fr; }
}
</style>
