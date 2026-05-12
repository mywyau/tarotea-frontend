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
  return {
    backgroundColor: levelSelectMetaData[index]?.comingSoon
      ? 'rgba(0,0,0,0.03)'
      : getLevelColor(index),
    '--step-index': String(index),
    '--step-offset': `clamp(${index * 0.65}rem, ${index * 4.2}vw, ${index * 2.6}rem)`,
    '--step-mobile-offset': `clamp(${index * 0.25}rem, ${index * 2.8}vw, ${index * 0.8}rem)`,
    '--step-delay': `${index * 125}ms`,
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
          <span class="step-number" aria-hidden="true">{{ level.number }}</span>

          <div class="step-copy">
            <div class="level-card-header">
              <div class="min-w-0">
                <div class="text-lg font-semibold text-gray-900">
                  {{ level.title }}
                </div>

                <div class="text-sm text-gray-700 mt-1">
                  {{ level.description }}
                </div>
              </div>

              <div class="topic-icon-wrap" role="img" :aria-label="`${level.title}: ${getLevelTopicIcon(level.id).label}`">
                <component :is="getLevelTopicIcon(level.id).icon" class="topic-icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
        </NuxtLink>

        <!-- Locked level (kept for later when you re-enable gating) -->
        <div v-else class="stair-step-link cursor-not-allowed">
          <span class="step-number" aria-hidden="true">{{ level.number }}</span>

          <div class="step-copy">
            <div class="level-card-header">
              <div class="min-w-0">
                <div class="text-lg font-semibold text-gray-900">
                  {{ level.title }}
                </div>

                <div class="text-sm text-gray-700 mt-1">
                  {{ level.description }}
                </div>

                <p class="text-sm text-gray-700 mt-3">
                  Upgrade to unlock
                </p>
              </div>

              <div class="topic-icon-wrap" role="img" :aria-label="`${level.title}: ${getLevelTopicIcon(level.id).label}`">
                <component :is="getLevelTopicIcon(level.id).icon" class="topic-icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
          <span v-else class="pill pill-locked">Locked</span>
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
  --step-depth: clamp(0.8rem, 1.7vw, 1.35rem);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  list-style: none;
  margin: 0;
  padding: 0 0 1.6rem;
}

.stair-step {
  position: relative;
  width: calc(100% - var(--step-offset));
  min-width: min(100%, 17rem);
  margin-left: var(--step-offset);
  border-radius: 1rem 1rem 0.45rem 0.45rem;
  box-shadow:
    0 var(--step-depth) 0 rgba(0, 0, 0, 0.16),
    0 calc(var(--step-depth) + 0.65rem) 1.35rem rgba(17, 24, 39, 0.12);
  transition: filter 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  isolation: isolate;
}

.stair-step::before {
  content: "";
  position: absolute;
  inset: auto 0 calc(var(--step-depth) * -1) 0;
  height: var(--step-depth);
  border-radius: 0 0 0.55rem 0.55rem;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.24));
  pointer-events: none;
  z-index: -1;
}

.stair-step::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0) 46%, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.stair-step:hover {
  filter: brightness(1.08);
  transform: translateY(-2px);
  box-shadow:
    0 calc(var(--step-depth) + 0.1rem) 0 rgba(0, 0, 0, 0.14),
    0 calc(var(--step-depth) + 0.9rem) 1.6rem rgba(17, 24, 39, 0.15);
}

.stair-step-fall-in {
  opacity: 0;
  transform: translate3d(-1.5rem, -7rem, 0) rotate(-4deg) scale(0.96);
  animation: stair-step-drop 780ms cubic-bezier(0.17, 0.84, 0.32, 1.18) var(--step-delay) forwards;
  will-change: opacity, transform;
}

.stair-step-link {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  min-height: 7.15rem;
  padding: 1.1rem 3.25rem 1.25rem 1.1rem;
  color: inherit;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.3rem;
  height: 2.3rem;
  margin-top: 0.15rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.36);
  color: rgba(17, 24, 39, 0.86);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.step-copy {
  min-width: 0;
  padding-right: 0.35rem;
}

.level-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.topic-icon-wrap {
  position: absolute;
  top: 1rem;
  right: 1rem;
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
  align-self: start;
  grid-column: 2;
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

@keyframes stair-step-drop {
  0% {
    opacity: 0;
    transform: translate3d(-1.5rem, -7rem, 0) rotate(-4deg) scale(0.96);
  }

  68% {
    opacity: 1;
    transform: translate3d(0, 0.35rem, 0) rotate(1deg) scale(1.015);
  }

  84% {
    opacity: 1;
    transform: translate3d(0, -0.18rem, 0) rotate(-0.35deg) scale(1);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}

@media (max-width: 640px) {
  .staircase {
    --step-depth: 0.75rem;
  }

  .stair-step {
    width: calc(100% - var(--step-mobile-offset));
    min-width: 0;
    margin-left: var(--step-mobile-offset);
    border-radius: 0.85rem 0.85rem 0.4rem 0.4rem;
  }

  .stair-step-link {
    grid-template-columns: 1fr;
    gap: 0.65rem;
    min-height: 8rem;
    padding: 1rem 2.9rem 1.1rem 1rem;
  }

  .step-number {
    width: 2rem;
    height: 2rem;
    margin-top: 0;
  }

  .pill {
    grid-column: auto;
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
