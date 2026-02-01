<script setup lang="ts">

import { useUpgrade } from '@/composables/useUpgrade'

const { me, authReady } = useMeState()

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

const quizLevels = [
  {
    id: 'level-one',
    number: 1,
    title: 'Level 1',
    description: 'Foundation vocabulary, identity, actions, daily life, and simple needs.'
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
    description: 'Intermediate, expressing thoughts, reasons, and everyday abstract concepts naturally.'
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
    description: 'Handle work situations, services, expectations, and real-life responsibilities.'
  },
]
</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">

    <h1 class="text-3xl font-semibold mb-4">
      Quiz
    </h1>

    <p class="text-gray-600 mb-8">
      Practice and test your cantonese with our quizzes
    </p>

    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <li v-for="quizLevel in quizLevels" :key="quizLevel.id" class="border rounded p-4 space-y-3" :class="{
        '': canAccessLevel(quizLevel.number, me),
        'opacity-60': !canAccessLevel(quizLevel.number, me)
      }">

        <div class="text-lg font-medium">
          {{ quizLevel.title }}
        </div>

        <div class="text-sm text-gray-600">
          {{ quizLevel.description }}
        </div>

        <!-- Accessible -->
        <div v-if="canAccessLevel(quizLevel.number, me)" class="flex gap-3 pt-2">
          <NuxtLink :to="`/quiz/${quizLevel.id}/word/start-quiz`"
            class="flex-1 rounded border px-3 py-2 text-sm text-center hover:bg-gray-100">
            Word quiz
          </NuxtLink>

          <NuxtLink :to="`/quiz/${quizLevel.id}/audio/start-quiz`"
            class="flex-1 rounded border px-3 py-2 text-sm text-center hover:bg-gray-100">
            Audio quiz
          </NuxtLink>
        </div>

        <!-- Locked -->
        <div v-else class="pt-2">
          <NuxtLink to="/upgrade/coming-soon" class="text-sm text-blue-600 hover:underline">
            🔒 Upgrade to unlock quiz
          </NuxtLink>
        </div>
      </li>
    </ul>

  </main>
</template>
