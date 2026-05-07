<script setup lang="ts">

definePageMeta({
  // middleware: ['coming-soon'],
  ssr: true,
})

import { brandColours } from '@/utils/branding/helpers'
import { levelSelectMetaData } from '@/utils/levels/helpers'
import { onMounted } from 'vue'
import { useMeStateV2 } from '~/composables/useMeStateV2'

const {
  authReady,
  resolve,
} = useMeStateV2()

function getLevelColor(index: number) {
  return brandColours[index % brandColours.length]
}

function isProgressPipActive(levelNumber: number, pipNumber: number) {
  return pipNumber <= levelNumber
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

    <BackLink to="/" />

    <header class="rounded-lg header-card">
      <h1 class="level-heading">Levels</h1>
      <p class="level-subheading mt-2">
        Explore Cantonese words and sentence patterns organised by level.
      </p>
    </header>

    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">

      <li v-for="(level, index) in levelSelectMetaData" :key="level.id"
        class="rounded-xl p-6 transition shadow-sm hover:shadow-md hover:brightness-110" :style="{
          backgroundColor: level.comingSoon
            ? 'rgba(0,0,0,0.03)'
            : getLevelColor(index)
        }">

        <!-- Accessible level -->
        <NuxtLink v-if="true" :to="`/level/${level.id}/v2`" class="block space-y-4">

          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="level-icon-wrap" :aria-label="`${level.title} progression icon`">
                <Icon :name="level.icon" class="level-icon" aria-hidden="true" />
                <span class="level-icon-number">{{ level.number }}</span>
              </div>

              <div>
                <div class="text-lg font-semibold text-gray-900">
                  {{ level.title }}
                </div>

                <div class="text-sm text-gray-700 mt-1">
                  {{ level.description }}
                </div>
              </div>
            </div>

            <div class="shrink-0">
              <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
            </div>
          </div>

          <div class="level-progress" :aria-label="`Level ${level.number} of ${levelSelectMetaData.length}`">
            <span v-for="pipNumber in levelSelectMetaData.length" :key="`${level.id}-pip-${pipNumber}`"
              class="level-progress-pip" :class="{ 'is-active': isProgressPipActive(level.number, pipNumber) }" />
          </div>

        </NuxtLink>

        <!-- Locked level (kept for later when you re-enable gating) -->
        <div v-else class="space-y-3 cursor-not-allowed">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-lg font-semibold text-gray-900">
                {{ level.title }}
              </div>

              <div class="text-sm text-gray-700 mt-1">
                {{ level.description }}
              </div>
            </div>

            <div class="shrink-0">
              <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
              <span v-else class="pill pill-locked">Locked</span>
            </div>
          </div>

          <p class="text-sm text-gray-700">
            Upgrade to unlock
          </p>
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

/* Header card */
.header-card {
  /* background: rgba(255, 255, 255, 0.65); */
  border-color: rgba(214, 163, 209, 0.40);
  backdrop-filter: blur(6px);
}

/* Level card base */
.level-card {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(214, 163, 209, 0.35);
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}

/* Active hover */
.level-card.is-active:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(234, 184, 228, 0.65);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}


.level-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 3.25rem;
  height: 3.25rem;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
  color: rgba(17, 24, 39, 0.82);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 8px 18px rgba(17, 24, 39, 0.08);
}

.level-icon {
  width: 1.6rem;
  height: 1.6rem;
}

.level-icon-number {
  position: absolute;
  right: -0.35rem;
  bottom: -0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.25rem;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: rgba(17, 24, 39, 0.82);
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
}

.level-progress {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 0.35rem;
  padding-top: 0.25rem;
}

.level-progress-pip {
  height: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.26);
}

.level-progress-pip.is-active {
  background: rgba(17, 24, 39, 0.66);
  box-shadow: none;
}

/* Coming soon */
.level-card.is-disabled {
  opacity: 0.70;
  cursor: not-allowed;
  background: rgba(168, 202, 224, 0.18);
  /* slight blue wash */
  border-color: rgba(0, 0, 0, 0.08);
}

/* Locked (not coming soon) */
.level-card.is-locked {
  opacity: 0.85;
  border-color: rgba(244, 205, 39, 0.30);
  /* subtle yellow border hint */
}

/* Pills */
.pill {
  display: inline-block;
  /* padding: 0.2rem 0.6rem; */
  /* border-radius: 999px; */
  font-size: 0.75rem;
  font-weight: 700;
  /* border: 1px solid rgba(0, 0, 0, 0.06); */
  color: rgba(0, 0, 0, 0.78);
}
</style>
