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

    <NuxtLink :to="`/`" class="inline-block text-sm text-black hover:underline">
      ← Home
    </NuxtLink>

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
        <NuxtLink v-if="true" :to="`/level/${level.id}`" class="block space-y-3">

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
            </div>
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
