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
    description: 'Foundation vocabulary for basic spoken Cantonese: identity, actions, daily life, and simple needs.'
  },
  {
    id: 'level-two',
    number: 2,
    title: 'Level  2',
    description: 'Spoken Cantonese for daily situations, intentions, feelings, and simple reasoning.'
  },
  {
    id: 'level-three',
    number: 3,
    title: 'Level  3',
    description: 'Intermediate spoken Cantonese. Expressing thoughts, reasons, and everyday abstract concepts naturally.'
  },
  // {
  //   id: 'level-four',
  //   title: 'Level  4',
  //   description: 'Express opinions, explain situations, discuss experiences, and handle real-life problems in natural spoken Cantonese.'
  // },
  //   {
  //   id: 'level-five',
  //   title: 'Level  5',
  //   description: 'Handle work situations, services, expectations, and real-life responsibilities in natural spoken Cantonese.'
  // },
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

    <!-- <p v-if="!me" class="mb-6 text-sm text-gray-500">
      Sign in to track progress and unlock advanced levels.
    </p> -->

    <p v-if="authReady && !me" class="mb-6 text-sm text-gray-500">
      Sign in to track progress and unlock advanced levels.
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

          <button class="mt-2 text-sm text-blue-600 hover:underline" @click="loginWithGoogle">
            Sign in to unlock
          </button>
        </div>
      </li>
    </ul>


    <div v-if="me && me.plan !== 'pro'" class="flex justify-center gap-3 mt-4">
      <button class="px-4 py-2 rounded bg-green-600 text-white" @click="upgrade('monthly')">
        £5.99 / month
      </button>

      <button class="px-4 py-2 rounded border border-green-600 text-green-700" @click="upgrade('yearly')">
        £59 / year
      </button>
    </div>

  </main>
</template>
