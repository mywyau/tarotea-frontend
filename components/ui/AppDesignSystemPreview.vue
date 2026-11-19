<script setup lang="ts">
import { ArrowRight, Check, Heart, RefreshCw, Trash2 } from '@lucide/vue'
</script>

<template>
  <AppPage size="wide">
    <AppPageHeader title="TaroTea design foundation"
      description="A development reference for semantic colour, typography, controls and reusable states."
      eyebrow="Step 1 · Warm learning studio">
      <template #actions>
        <AppButton variant="secondary">Secondary action</AppButton>
        <AppButton>
          Primary action
          <template #trailing>
            <ArrowRight />
          </template>
        </AppButton>
      </template>
    </AppPageHeader>

    <AppSection title="Type and colour" description="The proposed font is opt-in until route migration is approved.">
      <div class="preview-type-grid">
        <AppCard tone="pink">
          <AppBadge tone="primary">Vocabulary</AppBadge>
          <p class="preview-chinese">廣東話</p>
          <p class="preview-jyutping">gwong2 dung1 waa2</p>
          <p class="preview-meaning">Cantonese</p>
        </AppCard>
        <AppCard tone="blue">
          <AppBadge tone="info">Sentence</AppBadge>
          <p class="preview-sentence">我每日都學廣東話。</p>
          <p class="preview-meaning">I study Cantonese every day.</p>
        </AppCard>
      </div>
    </AppSection>

    <AppSection title="Actions" description="Every variant includes hover, active, focus, loading and disabled treatment.">
      <div class="preview-row">
        <AppButton>Primary</AppButton>
        <AppButton variant="secondary">Secondary</AppButton>
        <AppButton variant="quiet">Quiet</AppButton>
        <AppButton variant="destructive">
          <template #leading><Trash2 /></template>
          Delete
        </AppButton>
        <AppButton loading>Saving</AppButton>
        <AppButton disabled>Unavailable</AppButton>
        <AppIconButton label="Favourite word" variant="secondary">
          <Heart />
        </AppIconButton>
      </div>
    </AppSection>

    <AppSection title="Labels and fields">
      <div class="preview-row">
        <AppBadge>Neutral</AppBadge>
        <AppBadge tone="primary">Selected</AppBadge>
        <AppBadge tone="info">Listening</AppBadge>
        <AppBadge tone="success">Complete</AppBadge>
        <AppBadge tone="warning">In progress</AppBadge>
        <AppBadge tone="error">Needs attention</AppBadge>
      </div>

      <div class="preview-field-grid">
        <label>
          <span class="app-form-label">Display name</span>
          <input class="app-form-control" placeholder="Your name">
          <span class="app-form-hint">Shown in your personal learning space.</span>
        </label>
        <label>
          <span class="app-form-label">Practice mode</span>
          <select class="app-form-control">
            <option>Vocabulary</option>
            <option>Listening</option>
            <option>Sentences</option>
          </select>
        </label>
      </div>
    </AppSection>

    <AppSection title="System states">
      <div class="preview-state-grid">
        <AppStatusState title="Loading your words" description="This should only take a moment." tone="loading" compact />
        <AppStatusState title="Practice complete" description="Your progress has been saved." tone="success" compact>
          <template #icon><Check /></template>
        </AppStatusState>
        <AppStatusState title="We could not load this lesson" description="Try again without losing your progress."
          tone="error" compact>
          <template #actions>
            <AppButton size="small" variant="secondary">
              <template #leading><RefreshCw /></template>
              Try again
            </AppButton>
          </template>
        </AppStatusState>
      </div>
    </AppSection>
  </AppPage>
</template>

<style scoped>
.preview-type-grid,
.preview-state-grid,
.preview-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.preview-state-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.preview-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.preview-field-grid {
  margin-top: 1.5rem;
}

.preview-chinese,
.preview-sentence {
  margin: 1.5rem 0 0;
  font-family: var(--font-chinese);
  font-size: clamp(2rem, 6vw, 3.25rem);
  font-weight: 700;
  line-height: 1.15;
}

.preview-sentence {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
}

.preview-jyutping {
  margin: 0.55rem 0 0;
  color: rgb(var(--color-primary-strong));
  font-weight: 600;
}

.preview-meaning {
  margin: 0.35rem 0 0;
  color: rgb(var(--color-muted));
}

@media (max-width: 767px) {
  .preview-type-grid,
  .preview-state-grid,
  .preview-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
