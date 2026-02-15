<script setup lang="ts">

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

const quizLevels = [
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
    comingSoon: true,
    description: 'Handle work situations, services, and expectations.'
  },
  {
    id: 'level-six',
    number: 6,
    title: 'Level 6',
    comingSoon: true,
    description: 'Tell stories and describe past experiences naturally.'
  },
]

const isComingSoon = (level: any) => level.comingSoon === true

const canEnterLevel = (level: any) => {

  if (!authReady.value) return false

  if (isComingSoon(level)) return false

  // ✅ Free levels are always accessible
  if (isFreeLevel(level.number)) return true

  // 🔒 Paid levels require login
  if (!isLoggedIn.value) return false

  return canAccessLevel(entitlement.value!)
}

</script>


<template>
  <main class="max-w-3xl mx-auto py-12 px-4">

    <p class="text-gray-500 text-sm">
      Practice and test your cantonese with our level quizzes.
    </p>

    <p class="text-gray-500 text-sm mt-2 mb-8">
      Your weakest words will appear more often as you practice and study.
    </p>

    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <li v-for="quizLevel in quizLevels" :key="quizLevel.id" class="border rounded-lg p-4 space-y-3 transition" :class="[
        quizLevel.comingSoon
          ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-80'
          : canEnterLevel(quizLevel)
            ? ''
            : 'opacity-80'
      ]">

        <div class="text-lg font-medium">
          {{ quizLevel.title }}
          <span v-if="quizLevel.comingSoon" class="text-sm text-gray-400 font-normal">
            (Coming soon)
          </span>
        </div>

        <div class="text-sm text-gray-600">
          {{ quizLevel.description }}
        </div>

        <!-- ✅ Available & accessible -->
        <div v-if="canEnterLevel(quizLevel) && !isComingSoon(quizLevel)" class="flex gap-3 pt-2">
          <NuxtLink :to="`/quiz/${quizLevel.id}/word/start-quiz`"
            class="flex-1 rounded px-3 py-2 text-sm text-center bg-blue-50 text-blue-700 hover:bg-blue-100">
            Word quiz
          </NuxtLink>

          <NuxtLink :to="`/quiz/${quizLevel.id}/audio/start-quiz`"
            class="flex-1 rounded px-3 py-2 text-sm text-center bg-purple-50 text-purple-700 hover:bg-purple-100">
            Audio quiz
          </NuxtLink>
        </div>

        <!-- 🚧 Coming soon (paid OR free) -->
        <div v-else-if="isComingSoon(quizLevel)" class="pt-2 text-sm text-gray-400">
          Coming soon
        </div>

        <!-- 🔒 Locked (not paid) -->
        <div v-else class="pt-2">
          <p class="text-sm text-gray-500">
            Upgrade to unlock
          </p>
        </div>
      </li>
    </ul>

  </main>
</template>
