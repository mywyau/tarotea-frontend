<script setup lang="ts">

import { useUpgrade } from '@/composables/useUpgrade'

// const me = await useMe()
const { me, authReady } = useMeState()


function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

const levels = [
  {
    id: 'level-one',
    number: 1,
    title: 'Level 1',
    description: 'Foundation vocabulary: identity, actions, daily life, and simple needs.'
  },
  {
    id: 'level-two',
    number: 2,
    title: 'Level  2',
    description: 'Daily situations, intentions, feelings, and simple reasoning.'
  },
  {
    id: 'level-three',
    number: 3,
    title: 'Level  3',
    description: 'Intermediate cantonese, expressing thoughts, reasons, and everyday abstract concepts naturally.'
  },
  {
    id: 'level-four',
    title: 'Level  4 (Coming soon)',
    description: 'Express opinions, explain situations, discuss experiences, and handle real-life problems.'
  },
  {
    id: 'level-five',
    title: 'Level  5 (Coming soon)',
    description: 'Handle work situations, services, expectations, and real-life responsibilities.'
  },
  {
    id: 'level-six',
    title: 'Level 6 (Coming soon)',
    description: 'Tell stories, describe past experiences, and explain events clearly and naturally in spoken Cantonese.'
  },
]
</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">

    <h1 class="text-3xl font-semibold mb-4">
      Levels
    </h1>

    <p class="text-gray-600 mb-8">
      Explore Cantonese sentence patterns organised by Level
    </p>

    <ul class="space-y-4">

      <li v-for="level in levels" :key="level.id" class="border rounded p-4" :class="{
        'hover:bg-gray-50': canAccessLevel(level.number, me),
        'opacity-60 cursor-not-allowed': !canAccessLevel(level.number, me)
      }">

        <!-- Accessible level -->
        <NuxtLink v-if="canAccessLevel(level.number, me)" :to="`/level/${level.id}`" class="block">
          <div class="text-lg font-medium">
            {{ level.title }}
          </div>
          <div class="text-sm text-gray-600">
            {{ level.description }}
          </div>
        </NuxtLink>

        <!-- Locked level -->
        <div v-else class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-lg font-medium">
              🔒 {{ level.title }}
            </span>
          </div>

          <div class="text-sm text-gray-600">
            {{ level.description }}
          </div>

          <NuxtLink class="mt-2 text-sm text-blue-600 hover:underline" :to="`/upgrade/coming-soon`">
            Sign in and upgrade to unlock
          </NuxtLink>
        </div>
      </li>
    </ul>
  </main>
</template>
