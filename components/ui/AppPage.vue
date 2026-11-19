<script setup lang="ts">
type AppPageSize = 'compact' | 'reading' | 'wide'

const props = withDefaults(defineProps<{
  as?: string
  size?: AppPageSize
}>(), {
  as: 'main',
  size: 'reading',
})
</script>

<template>
  <component :is="props.as" class="app-page" :class="`app-page-${props.size}`">
    <slot />
  </component>
</template>

<style scoped>
.app-page {
  width: 100%;
  margin-inline: auto;
  padding: clamp(2rem, 6vw, 4.5rem) var(--page-gutter);
  color: rgb(var(--color-ink));
  font-family: var(--font-brand);
}

.app-page-compact {
  max-width: var(--content-compact);
}

.app-page-reading {
  max-width: var(--content-reading);
}

.app-page-wide {
  max-width: var(--content-wide);
}
</style>
