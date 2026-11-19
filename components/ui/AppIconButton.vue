<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  to?: string
  href?: string
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive'
  size?: 'small' | 'default' | 'large'
  disabled?: boolean
  loading?: boolean
}>(), {
  to: undefined,
  href: undefined,
  variant: 'quiet',
  size: 'default',
  disabled: false,
  loading: false,
})
</script>

<template>
  <AppButton :to="props.to" :href="props.href" :variant="props.variant" :size="props.size"
    :disabled="props.disabled" :loading="props.loading" class="app-icon-button" :aria-label="props.label"
    :title="props.label">
    <slot />
  </AppButton>
</template>

<style scoped>
.app-icon-button {
  width: 2.75rem;
  min-width: 2.75rem;
  padding: 0;
}

.app-icon-button :deep(.app-button-label) {
  display: inline-flex;
}

.app-icon-button :deep(svg) {
  width: 1.2rem;
  height: 1.2rem;
}
</style>
