<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  headingId?: string
  spacing?: 'compact' | 'default' | 'generous'
}>(), {
  title: undefined,
  description: undefined,
  headingId: undefined,
  spacing: 'default',
})

const generatedId = useId()
const resolvedHeadingId = computed(() => props.headingId || `app-section-${generatedId}`)
</script>

<template>
  <section class="app-section" :class="`app-section-${props.spacing}`"
    :aria-labelledby="props.title ? resolvedHeadingId : undefined">
    <div v-if="props.title || props.description || $slots.actions" class="app-section-header">
      <div>
        <h2 v-if="props.title" :id="resolvedHeadingId" class="app-section-title">
          {{ props.title }}
        </h2>
        <p v-if="props.description" class="app-section-description">
          {{ props.description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="app-section-actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.app-section-compact + .app-section-compact {
  margin-top: 1.5rem;
}

.app-section-default + .app-section-default,
.app-section-compact + .app-section-default,
.app-section-default + .app-section-compact {
  margin-top: clamp(2.5rem, 6vw, 4rem);
}

.app-section-generous + .app-section,
.app-section + .app-section-generous {
  margin-top: clamp(4rem, 9vw, 6rem);
}

.app-section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.app-section-title {
  margin: 0;
  color: rgb(var(--color-ink));
  font-size: clamp(1.25rem, 3vw, 1.65rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.app-section-description {
  max-width: 42rem;
  margin: 0.4rem 0 0;
  color: rgb(var(--color-muted));
  line-height: 1.6;
}

.app-section-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 639px) {
  .app-section-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
