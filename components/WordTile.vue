<script setup lang="ts">
import { NuxtLink } from '#components'
import { masteryXp } from '@/config/xp/helpers'
import { CheckCircle2 } from '@lucide/vue'

const props = defineProps<{
  to?: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
  mastered?: boolean
}>()

const progress = computed(() => Math.min((props.xp ?? 0) / masteryXp * 100, 100))
</script>

<template>
  <component :is="props.to ? NuxtLink : 'div'" :to="props.to" class="word-tile">
    <span v-if="props.mastered" class="word-tile-status" aria-label="Mastered">
      <CheckCircle2 aria-hidden="true" />
    </span>

    <strong class="word-tile-chinese" lang="zh-HK">{{ props.word }}</strong>
    <span class="word-tile-jyutping">{{ props.jyutping }}</span>
    <span class="word-tile-meaning">{{ props.meaning }}</span>

    <div class="word-tile-progress">
      <span>{{ props.xp ?? 0 }} XP</span>
      <span class="word-tile-track" aria-hidden="true">
        <span :style="{ width: `${progress}%` }" />
      </span>
    </div>
  </component>
</template>

<style scoped>
.word-tile {
  position: relative;
  display: flex;
  min-height: 10.5rem;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgb(var(--color-ink) / 0.1);
  border-radius: var(--radius-card);
  padding: 1.2rem;
  background: rgb(var(--color-surface) / 0.76);
  color: rgb(var(--color-ink));
  text-align: center;
  text-decoration: none;
  box-shadow: 0 1px 2px rgb(var(--color-ink) / 0.035);
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease, transform var(--motion-fast) ease;
}

.word-tile:hover {
  border-color: rgb(var(--color-primary) / 0.35);
  box-shadow: var(--shadow-soft);
  transform: translateY(-2px);
}

.word-tile-status {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: inline-flex;
  color: rgb(var(--color-success));
}

.word-tile-status svg {
  width: 1.1rem;
  height: 1.1rem;
}

.word-tile-chinese {
  font-family: var(--font-chinese);
  font-size: clamp(1.45rem, 4vw, 1.8rem);
  line-height: 1.25;
}

.word-tile-jyutping {
  margin-top: 0.45rem;
  color: rgb(var(--color-primary-strong));
  font-size: 0.82rem;
  font-weight: 700;
}

.word-tile-meaning {
  margin-top: 0.25rem;
  color: rgb(var(--color-muted));
  font-size: 0.78rem;
  line-height: 1.4;
}

.word-tile-progress {
  width: 100%;
  margin-top: auto;
  padding-top: 1.15rem;
  color: rgb(var(--color-muted));
  font-size: 0.7rem;
}

.word-tile-track {
  display: block;
  height: 0.3rem;
  margin-top: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(var(--color-ink) / 0.1);
}

.word-tile-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(var(--color-success));
  transition: width var(--motion-deliberate) ease;
}

@media (max-width: 359px) {
  .word-tile {
    min-height: 9.75rem;
    padding: 1rem 0.75rem;
  }
}
</style>
