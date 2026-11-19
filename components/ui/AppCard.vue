<script setup lang="ts">
type AppCardTone = 'surface' | 'subtle' | 'pink' | 'lilac' | 'blue' | 'blush'
type AppCardPadding = 'compact' | 'default' | 'generous'

const props = withDefaults(defineProps<{
  as?: string
  tone?: AppCardTone
  padding?: AppCardPadding
  elevated?: boolean
  interactive?: boolean
}>(), {
  as: 'div',
  tone: 'surface',
  padding: 'default',
  elevated: false,
  interactive: false,
})
</script>

<template>
  <component :is="props.as" class="app-card" :class="[
    `app-card-${props.tone}`,
    `app-card-padding-${props.padding}`,
    { 'app-card-elevated': props.elevated, 'app-card-interactive': props.interactive },
  ]">
    <slot />
  </component>
</template>

<style scoped>
.app-card {
  border: 1px solid rgb(var(--color-ink) / 0.1);
  border-radius: var(--radius-card);
  color: rgb(var(--color-ink));
}

.app-card-padding-compact {
  padding: 1rem;
}

.app-card-padding-default {
  padding: clamp(1.25rem, 4vw, 1.75rem);
}

.app-card-padding-generous {
  padding: clamp(1.75rem, 5vw, 2.5rem);
}

.app-card-surface {
  background: rgb(var(--color-surface));
}

.app-card-subtle {
  background: rgb(var(--color-ink) / 0.035);
}

.app-card-pink {
  background: rgb(var(--color-taro-pink) / 0.35);
}

.app-card-lilac {
  background: rgb(var(--color-taro-lilac) / 0.32);
}

.app-card-blue {
  background: rgb(var(--color-taro-blue) / 0.38);
}

.app-card-blush {
  background: rgb(var(--color-taro-blush) / 0.55);
}

.app-card-elevated {
  border-color: transparent;
  box-shadow: var(--shadow-soft);
}

.app-card-interactive {
  transition: border-color var(--motion-fast) ease,
    box-shadow var(--motion-fast) ease,
    transform var(--motion-fast) ease;
}

.app-card-interactive:hover {
  border-color: rgb(var(--color-primary) / 0.32);
  box-shadow: var(--shadow-soft);
  transform: translateY(-2px);
}
</style>
