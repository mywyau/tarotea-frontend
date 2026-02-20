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
  <main class="max-w-3xl mx-auto py-12 px-4">

    <p class="text-gray-500 text-sm mb-8">
      Explore Cantonese words and sentence patterns organised by level
    </p>

    <ul class="space-y-4">


      <li v-for="level in levels" :key="level.id" class="border rounded-lg p-4 space-y-3 transition" :class="[
        level.comingSoon
          ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-80'
          : canEnterLevel(level)
            ? 'hover:bg-gray-50'
            : 'opacity-80'
      ]">

        <!-- Accessible level -->
        <!-- <NuxtLink v-if="canEnterLevel(level)" :to="`/level/${level.id}`" class="block"> -->
          <NuxtLink v-if="true" :to="`/level/${level.id}`" class="block">
          <div class="text-lg font-medium">
            {{ level.title }}
            <span v-if="level.comingSoon" class="text-sm text-gray-400 font-normal">
              (Coming soon)
            </span>
          </div>

          <div class="text-sm text-gray-600">
            {{ level.description }}
          </div>
        </NuxtLink>

        <!-- Locked level -->
        <div v-else class="space-y-2 cursor-not-allowed">
          <div class="text-lg font-medium">
            {{ level.title }}
            <span v-if="level.comingSoon" class="text-sm text-gray-400 font-normal">
              (Coming soon)
            </span>
          </div>

          <div class="text-sm text-gray-600">
            {{ level.description }}
          </div>

          <p v-if="!isFreeLevel(level.number)" class="text-sm text-gray-500">
            Upgrade to unlock
          </p>
        </div>

      </li>
    </ul>
  </main>
</template>
