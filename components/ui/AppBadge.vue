<script setup lang="ts">
const props = withDefaults(defineProps<{
  tone?: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}>(), {
  tone: 'neutral',
})
</script>

<template>
  <span class="app-badge" :class="`app-badge-${props.tone}`">
    <slot />
  </span>
</template>

<style scoped>
.app-badge {
  display: inline-flex;
  min-height: 1.65rem;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-family: var(--font-brand);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.app-badge-neutral {
  background: rgb(var(--color-ink) / 0.065);
  color: rgb(var(--color-ink));
}

.app-badge-primary {
  background: rgb(var(--color-taro-pink) / 0.42);
  color: rgb(var(--color-primary-strong));
}

.app-badge-info {
  background: rgb(var(--color-taro-blue) / 0.45);
  color: rgb(var(--color-ink));
}

.app-badge-success {
  background: rgb(var(--color-success) / 0.18);
  color: rgb(var(--color-ink));
}

.app-badge-warning {
  background: rgb(var(--color-taro-yellow) / 0.25);
  color: rgb(var(--color-ink));
}

.app-badge-error {
  background: rgb(var(--color-error) / 0.14);
  color: rgb(var(--color-error-strong));
}
</style>
