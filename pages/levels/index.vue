<script setup lang="ts">

definePageMeta({
  // middleware: ['coming-soon'],
  ssr: true,
})

import { brandColours } from '@/utils/branding/helpers'
import { levelSelectMetaData } from '@/utils/levels/helpers'
import { getLevelTopicIcon } from '@/utils/levels/topicIcons'
import { onMounted } from 'vue'
import { useMeStateV2 } from '~/composables/useMeStateV2'

const {
  authReady,
  resolve,
} = useMeStateV2()

function getLevelColor(index: number) {
  return brandColours[index % brandColours.length]
}

function getLevelStepStyle(index: number) {
  const level = levelSelectMetaData[index]

  return {
    '--level-color': level?.comingSoon
      ? 'rgba(0,0,0,0.03)'
      : getLevelColor(index),
    '--step-delay': `${index * 120}ms`,
  }
}

// --- helpers ---

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

</script>

<template>
  <main v-if="authReady" class="levels-page max-w-3xl mx-auto py-12 px-4 space-y-10">

    <header class="rounded-lg header-card">
      <h1 class="level-heading">Levels</h1>
      <p class="level-subheading mt-2">
        Explore Cantonese words and sentence patterns organised by level.
      </p>
    </header>

    <ul class="staircase" aria-label="Level staircase">

      <li v-for="(level, index) in levelSelectMetaData" :key="level.id" class="stair-step stair-step-fall-in"
        :class="{ 'is-disabled': level.comingSoon }" :style="getLevelStepStyle(index)">

        <!-- Accessible level -->
        <NuxtLink v-if="true" :to="`/level/${level.id}/v2`" class="stair-step-link">
          <div class="tower-stack" aria-hidden="true">
            <span v-for="floor in level.number" :key="floor" class="tower-floor" />
          </div>

          <div class="tower-label">
            <div class="level-card-header">
              <div class="min-w-0">
                <span class="step-number">Level {{ level.number }}</span>
                <div class="text-lg font-semibold text-gray-900 mt-1">
                  {{ level.title }}
                </div>
              </div>

              <div class="topic-icon-wrap" role="img" :aria-label="`${level.title}: ${getLevelTopicIcon(level.id).label}`">
                <component :is="getLevelTopicIcon(level.id).icon" class="topic-icon" aria-hidden="true" />
              </div>
            </div>

            <div class="text-sm text-gray-700 mt-2">
              {{ level.description }}
            </div>

            <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
          </div>
        </NuxtLink>

        <!-- Locked level (kept for later when you re-enable gating) -->
        <div v-else class="stair-step-link cursor-not-allowed">
          <div class="tower-stack" aria-hidden="true">
            <span v-for="floor in level.number" :key="floor" class="tower-floor" />
          </div>

          <div class="tower-label">
            <div class="level-card-header">
              <div class="min-w-0">
                <span class="step-number">Level {{ level.number }}</span>
                <div class="text-lg font-semibold text-gray-900 mt-1">
                  {{ level.title }}
                </div>
              </div>

              <div class="topic-icon-wrap" role="img" :aria-label="`${level.title}: ${getLevelTopicIcon(level.id).label}`">
                <component :is="getLevelTopicIcon(level.id).icon" class="topic-icon" aria-hidden="true" />
              </div>
            </div>

            <div class="text-sm text-gray-700 mt-2">
              {{ level.description }}
            </div>

            <p class="text-sm text-gray-700 mt-3">
              Upgrade to unlock
            </p>

            <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
            <span v-else class="pill pill-locked">Locked</span>
          </div>
        </div>
      </li>
    </ul>
  </main>

  <div v-else class="py-20 text-center text-gray-500">
    Loading levels...
  </div>
</template>

<style scoped>
/* Palette variables */
.levels-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  border-radius: 16px;
  padding-bottom: 2rem;
}

.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.header-card {
  border-color: rgba(214, 163, 209, 0.40);
  backdrop-filter: blur(6px);
}

.staircase {
  --floor-height: clamp(1.15rem, 2.3vw, 1.65rem);
  --tower-width: clamp(8.4rem, 16vw, 11.5rem);
  display: flex;
  align-items: flex-end;
  gap: clamp(0.7rem, 1.6vw, 1.2rem);
  min-height: 31rem;
  list-style: none;
  margin: 0;
  overflow-x: auto;
  padding: 2.25rem 0.25rem 1.8rem;
  scrollbar-width: thin;
}

.stair-step {
  position: relative;
  flex: 0 0 var(--tower-width);
  transition: filter 180ms ease, transform 180ms ease;
  isolation: isolate;
}

.stair-step:hover {
  filter: brightness(1.06);
  transform: translateY(-3px);
}

.stair-step-fall-in {
  opacity: 0;
  transform: translate3d(0, -7rem, 0) rotate(-3deg) scale(0.96);
  animation: tower-block-drop 760ms cubic-bezier(0.17, 0.84, 0.32, 1.18) var(--step-delay) forwards;
  will-change: opacity, transform;
}

.stair-step-link {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: inherit;
}

.tower-stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 0.18rem;
  filter: drop-shadow(0 1rem 1.1rem rgba(17, 24, 39, 0.15));
}

.tower-floor {
  position: relative;
  display: block;
  height: var(--floor-height);
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 0.5rem 0.5rem 0.25rem 0.25rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0) 48%, rgba(0, 0, 0, 0.07)),
    var(--level-color);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 0.28rem 0 rgba(0, 0, 0, 0.11);
}

.tower-floor::after {
  content: "";
  position: absolute;
  inset: 42% 12% auto;
  height: 1px;
  background: rgba(17, 24, 39, 0.12);
}

.tower-floor:first-child {
  border-radius: 0.5rem 0.5rem 0.85rem 0.85rem;
}

.tower-floor:last-child {
  border-radius: 0.95rem 0.95rem 0.25rem 0.25rem;
}

.tower-label {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 10rem;
  margin-top: -0.15rem;
  padding: 1rem 2.6rem 1rem 1rem;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 0.35rem 0.35rem 1rem 1rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 52%, rgba(0, 0, 0, 0.06)),
    var(--level-color);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    0 0.65rem 0 rgba(0, 0, 0, 0.14),
    0 1.35rem 1.45rem rgba(17, 24, 39, 0.12);
}

.level-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border-radius: 999px;
  color: rgba(17, 24, 39, 0.72);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.topic-icon-wrap {
  position: absolute;
  top: 1rem;
  right: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(17, 24, 39, 0.82);
}

.topic-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2.25;
}

.pill {
  display: inline-block;
  width: fit-content;
  margin-top: 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.78);
}

.pill-locked {
  background: rgba(244, 205, 39, 0.60);
  color: rgba(0, 0, 0, 0.80);
}

.stair-step.is-disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

@keyframes tower-block-drop {
  0% {
    opacity: 0;
    transform: translate3d(0, -7rem, 0) rotate(-3deg) scale(0.96);
  }

  68% {
    opacity: 1;
    transform: translate3d(0, 0.45rem, 0) rotate(0.8deg) scale(1.015);
  }

  84% {
    opacity: 1;
    transform: translate3d(0, -0.18rem, 0) rotate(-0.25deg) scale(1);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}

@media (max-width: 640px) {
  .levels-page {
    max-width: 100%;
  }

  .staircase {
    --floor-height: 1.05rem;
    --tower-width: 8.25rem;
    min-height: 27rem;
    padding-bottom: 1.4rem;
  }


  .tower-label {
    min-height: 9.75rem;
    padding: 0.9rem 2.45rem 0.95rem 0.9rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stair-step,
  .stair-step:hover {
    transition: none;
    transform: none;
  }

  .stair-step-fall-in {
    opacity: 1;
    transform: none;
    animation: none;
    will-change: auto;
  }
}
</style>
