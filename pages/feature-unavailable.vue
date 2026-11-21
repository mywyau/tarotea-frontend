<script setup lang="ts">
useSeoMeta({
  title: 'Feature temporarily unavailable · TaroTea',
  robots: 'noindex',
})

const route = useRoute()
const heading = computed(() => {
  if (route.query.feature === 'daily') return 'Daily practice is paused'
  if (route.query.feature === 'pronunciation') return 'Speaking practice is taking a short break'
  return 'This feature is taking a short break'
})
</script>

<template>
  <AppPage size="compact" class="feature-unavailable-page">
    <AppCard padding="generous">
      <AppBadge tone="neutral">Temporarily unavailable</AppBadge>
      <h1>{{ heading }}</h1>
      <p v-if="route.query.feature === 'daily'">Level and topic quizzes are available to practise vocabulary and listening.</p>
      <p v-else>
        We’ve paused this feature while we improve its reliability and capacity. Your existing learning progress is not affected.
      </p>
      <div class="feature-unavailable-actions">
        <AppButton to="/quiz">Choose another quiz</AppButton>
        <AppButton to="/topics" variant="secondary">Browse topics</AppButton>
      </div>
    </AppCard>
  </AppPage>
</template>

<style scoped>
.feature-unavailable-page { min-height: 62vh; padding-block: clamp(3rem, 9vw, 7rem); }
.feature-unavailable-page h1 { margin: 1rem 0 0; font-size: clamp(2rem, 6vw, 3.5rem); letter-spacing: -0.05em; line-height: 1.05; }
.feature-unavailable-page p { margin: 1rem 0 0; color: rgb(var(--color-muted)); line-height: 1.65; }
.feature-unavailable-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; }
</style>
