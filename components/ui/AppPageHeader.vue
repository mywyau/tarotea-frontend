<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
  align?: 'left' | 'center'
  headingId?: string
}>(), {
  description: undefined,
  eyebrow: undefined,
  align: 'left',
  headingId: undefined,
})
</script>

<template>
  <header class="app-page-header" :class="`app-page-header-${props.align}`">
    <div class="app-page-header-copy">
      <p v-if="props.eyebrow" class="app-page-header-eyebrow">
        {{ props.eyebrow }}
      </p>
      <h1 :id="props.headingId" class="app-page-header-title">
        {{ props.title }}
      </h1>
      <p v-if="props.description" class="app-page-header-description">
        {{ props.description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="app-page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.app-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
}

.app-page-header-copy {
  min-width: 0;
  max-width: 44rem;
}

.app-page-header-center {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.app-page-header-eyebrow {
  margin: 0 0 0.55rem;
  color: rgb(var(--color-primary-strong));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.app-page-header-title {
  margin: 0;
  color: rgb(var(--color-ink));
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.05;
}

.app-page-header-description {
  max-width: 42rem;
  margin: 0.9rem 0 0;
  color: rgb(var(--color-muted));
  font-size: clamp(1rem, 2vw, 1.125rem);
  line-height: 1.65;
}

.app-page-header-center .app-page-header-description {
  margin-inline: auto;
}

.app-page-header-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 639px) {
  .app-page-header:not(.app-page-header-center) {
    align-items: stretch;
    flex-direction: column;
  }

  .app-page-header-actions {
    width: 100%;
  }
}
</style>
