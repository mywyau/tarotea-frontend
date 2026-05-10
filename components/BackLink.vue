<script setup lang="ts">
import { NuxtLink } from '#components'
import { ArrowLeft } from '@lucide/vue'

const props = withDefaults(defineProps<{
  fallback?: string
  label?: string
  to?: string
}>(), {
  fallback: '/',
  label: 'Back',
  to: undefined,
})

const goBack = useGoBack(props.fallback)
</script>

<template>
  <component
    :is="props.to ? NuxtLink : 'button'"
    :to="props.to"
    :type="props.to ? undefined : 'button'"
    class="back-link-control"
    @click="props.to ? undefined : goBack()"
  >
    <ArrowLeft class="h-4 w-4" aria-hidden="true" />
    <span>{{ label }}</span>
  </component>
</template>

<style scoped>
.back-link-control {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 4.75rem);
  left: max(1rem, calc((100vw - 64rem) / 2 + 1rem));
  z-index: 35;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.375rem 0.625rem;
  color: #000;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-decoration: none;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition:
    background 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;
}

.back-link-control:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  text-decoration: underline;
}

.back-link-control:active {
  transform: translateY(1px);
}

.back-link-control:focus-visible {
  outline: 2px solid #7A6FCB;
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .back-link-control {
    top: calc(env(safe-area-inset-top, 0px) + 4.5rem);
    left: 0.75rem;
  }
}
</style>
