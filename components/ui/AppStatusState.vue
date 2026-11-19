<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  tone?: 'neutral' | 'loading' | 'success' | 'error'
  compact?: boolean
}>(), {
  description: undefined,
  tone: 'neutral',
  compact: false,
})

const liveRole = computed(() => props.tone === 'error' ? 'alert' : 'status')
</script>

<template>
  <div class="app-status-state" :class="[
    `app-status-state-${props.tone}`,
    { 'app-status-state-compact': props.compact },
  ]" :role="liveRole" :aria-live="props.tone === 'error' ? 'assertive' : 'polite'">
    <span v-if="props.tone === 'loading'" class="app-status-spinner" aria-hidden="true" />
    <div v-else-if="$slots.icon" class="app-status-icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <div>
      <h2 class="app-status-title">
        {{ props.title }}
      </h2>
      <p v-if="props.description" class="app-status-description">
        {{ props.description }}
      </p>
      <div v-if="$slots.actions" class="app-status-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-status-state {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border: 1px solid rgb(var(--color-ink) / 0.1);
  border-radius: var(--radius-card);
  background: rgb(var(--color-surface));
  padding: clamp(1.25rem, 4vw, 1.75rem);
  color: rgb(var(--color-ink));
  font-family: var(--font-brand);
}

.app-status-state-compact {
  padding: 1rem;
}

.app-status-state-success {
  border-color: rgb(var(--color-success) / 0.32);
  background: rgb(var(--color-success) / 0.09);
}

.app-status-state-error {
  border-color: rgb(var(--color-error) / 0.3);
  background: rgb(var(--color-error) / 0.075);
}

.app-status-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}

.app-status-description {
  margin: 0.35rem 0 0;
  color: rgb(var(--color-muted));
  line-height: 1.55;
}

.app-status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.app-status-icon,
.app-status-spinner {
  width: 1.35rem;
  height: 1.35rem;
  flex: 0 0 auto;
}

.app-status-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.app-status-spinner {
  border: 2px solid rgb(var(--color-primary) / 0.3);
  border-top-color: rgb(var(--color-primary));
  border-radius: 999px;
  animation: app-status-spin 700ms linear infinite;
}

@keyframes app-status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
