<script setup lang="ts">
import { computed, resolveComponent } from 'vue'

type AppButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive'
type AppButtonSize = 'small' | 'default' | 'large'

const props = withDefaults(defineProps<{
  to?: string
  href?: string
  target?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: AppButtonVariant
  size?: AppButtonSize
  disabled?: boolean
  loading?: boolean
  block?: boolean
}>(), {
  to: undefined,
  href: undefined,
  target: undefined,
  type: 'button',
  variant: 'primary',
  size: 'default',
  disabled: false,
  loading: false,
  block: false,
})

const isDisabled = computed(() => props.disabled || props.loading)

const componentType = computed(() => {
  if (isDisabled.value && (props.to || props.href)) return 'span'
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return 'button'
})

const componentProps = computed(() => {
  if (props.to && !isDisabled.value) return { to: props.to }
  if (props.href && !isDisabled.value) {
    return {
      href: props.href,
      target: props.target,
      rel: props.target === '_blank' ? 'noopener noreferrer' : undefined,
    }
  }
  if (!props.to && !props.href) {
    return {
      type: props.type,
      disabled: isDisabled.value,
    }
  }
  return {}
})
</script>

<template>
  <component :is="componentType" v-bind="componentProps" class="app-button" :class="[
    `app-button-${props.variant}`,
    `app-button-${props.size}`,
    { 'app-button-block': props.block, 'app-button-disabled': isDisabled },
  ]" :aria-disabled="isDisabled ? 'true' : undefined" :aria-busy="props.loading ? 'true' : undefined">
    <span v-if="$slots.leading" class="app-button-icon" aria-hidden="true">
      <slot name="leading" />
    </span>
    <span v-if="props.loading" class="app-button-spinner" aria-hidden="true" />
    <span class="app-button-label">
      <slot />
    </span>
    <span v-if="$slots.trailing" class="app-button-icon" aria-hidden="true">
      <slot name="trailing" />
    </span>
  </component>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  font-family: var(--font-brand);
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  text-decoration: none;
  transition: background var(--motion-fast) ease,
    border-color var(--motion-fast) ease,
    color var(--motion-fast) ease,
    transform var(--motion-fast) ease;
  -webkit-tap-highlight-color: transparent;
}

.app-button:hover:not(.app-button-disabled) {
  transform: translateY(-1px);
}

.app-button:active:not(.app-button-disabled) {
  transform: translateY(0) scale(0.98);
}

.app-button-small {
  min-height: 2.5rem;
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
}

.app-button-default {
  padding: 0.75rem 1.1rem;
  font-size: 0.95rem;
}

.app-button-large {
  min-height: 3.25rem;
  padding: 0.9rem 1.35rem;
  font-size: 1rem;
}

.app-button-primary {
  background: rgb(var(--color-primary));
  color: white;
}

.app-button-primary:hover:not(.app-button-disabled) {
  background: rgb(var(--color-primary-strong));
}

.app-button-secondary {
  border-color: rgb(var(--color-primary) / 0.3);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-primary-strong));
}

.app-button-secondary:hover:not(.app-button-disabled) {
  border-color: rgb(var(--color-primary) / 0.55);
  background: rgb(var(--color-taro-pink) / 0.2);
}

.app-button-quiet {
  color: rgb(var(--color-ink));
}

.app-button-quiet:hover:not(.app-button-disabled) {
  background: rgb(var(--color-ink) / 0.055);
}

.app-button-destructive {
  background: rgb(var(--color-error));
  color: white;
}

.app-button-destructive:hover:not(.app-button-disabled) {
  background: rgb(var(--color-error-strong));
}

.app-button-block {
  width: 100%;
}

.app-button-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.app-button-icon {
  display: inline-flex;
  flex: 0 0 auto;
}

.app-button-icon :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.app-button-spinner {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: app-button-spin 700ms linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
