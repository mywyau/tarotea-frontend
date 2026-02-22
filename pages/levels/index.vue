<script setup lang="ts">

definePageMeta({
  // middleware: ['coming-soon'],
  ssr: true,
})

import { onMounted } from 'vue'

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  hasPaidAccess,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

const levels = [
  {
    id: 'level-one',
    number: 1,
    title: 'Level 1',
    comingSoon: false,
    description: 'Foundation vocabulary: identity, actions, daily life, and simple needs.'
  },
  {
    id: 'level-two',
    number: 2,
    title: 'Level 2',
    comingSoon: false,
    description: 'Daily situations, intentions, feelings, and simple reasoning.'
  },
  {
    id: 'level-three',
    number: 3,
    title: 'Level 3',
    comingSoon: false,
    description: 'Intermediate Cantonese, expressing thoughts and reasons naturally.'
  },
  {
    id: 'level-four',
    number: 4,
    title: 'Level 4',
    comingSoon: false,
    description: 'Express opinions, explain situations, discuss experiences.'
  },
  {
    id: 'level-five',
    number: 5,
    title: 'Level 5',
    comingSoon: false,
    description: 'Handle work situations, services, and expectations.'
  },
  {
    id: 'level-six',
    number: 6,
    title: 'Level 6',
    comingSoon: true,
    description: 'Tell stories and describe past experiences naturally.'
  },
  {
    id: 'level-seven',
    number: 7,
    title: 'Level 7',
    comingSoon: true,
    description: 'Express opinions tactfully, disagree politely, persuade gently, and manage sensitive situations.'
  },
  {
    id: 'level-eight',
    number: 8,
    title: 'Level 8',
    comingSoon: true,
    description: 'Understand and use common idioms, cultural expressions, and implied meanings in natural, informal speech.'
  },
  {
    id: 'level-nine',
    number: 9,
    title: 'Level 9',
    comingSoon: true,
    description: 'Discuss news, social issues, trends, and abstract ideas clearly.'
  },
  {
    id: 'level-ten',
    number: 10,
    title: 'Level 10',
    comingSoon: true,
    description: 'Speak naturally, react instinctively, and handle fast, casual conversations.'
  },
]

// --- helpers ---

const canEnterLevel = (level: any) => {

  if (!authReady.value) return false
  if (level.comingSoon) return false

  // Free levels (1–2)
  // if (isFreeLevel(level.number)) return true

  // Paid levels
  if (!isLoggedIn.value) return false

  return canAccessLevel(entitlement.value!)
}

</script>

<template>
  <main v-if="authReady" class="levels-page max-w-3xl mx-auto py-12 px-4 space-y-8">

    <header class="rounded-lg p-5 header-card">
      <h1 class="text-2xl font-semibold text-gray-900">Levels</h1>
      <p class="text-gray-700 text-sm mt-2">
        Explore Cantonese words and sentence patterns organised by level.
      </p>
    </header>

    <ul class="space-y-4">

      <li v-for="level in levels" :key="level.id" class="level-card rounded-lg p-4 transition" :class="[
        level.comingSoon
          ? 'is-disabled'
          : canEnterLevel(level)
            ? 'is-active'
            : 'is-locked'
      ]">
        <!-- Accessible level -->
        <!-- Use your real gating when ready: v-if="canEnterLevel(level)" -->
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
              <!-- <span v-else-if="!canEnterLevel(level)" class="pill pill-locked">Locked</span> -->
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
  /* assuming this is what you meant */
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  /* background: linear-gradient(180deg,
      rgba(246, 225, 225, 0.70) 0%,
      rgba(255, 255, 255, 0.85) 45%,
      rgba(168, 202, 224, 0.40) 100%); */
  border-radius: 16px;
  padding-bottom: 2rem;
}

/* Header card */
.header-card {
  background: rgba(255, 255, 255, 0.65);
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

.pill-soon {
  /* background: rgba(168, 202, 224, 0.55); */
}

.pill-locked {
  /* background: rgba(244, 205, 39, 0.60); */
}
</style>
