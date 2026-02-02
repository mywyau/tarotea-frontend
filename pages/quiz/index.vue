<script setup lang="ts">

const { me, authReady } = useMeState()

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
    title: 'Level  2',
    comingSoon: false,
    description: 'Daily situations, intentions, feelings, and simple reasoning.'
  },
  {
    id: 'level-three',
    number: 3,
    title: 'Level  3',
    comingSoon: false,
    description: 'Expressing thoughts, reasons, and everyday abstract concepts naturally.'
  },
  {
    id: 'level-four',
    title: 'Level  4',
    comingSoon: true,
    description: 'Express opinions, explain situations, discuss experiences, and handle real-life problems.'
  },
  {
    id: 'level-five',
    title: 'Level  5',
    comingSoon: true,
    description: 'Handle work situations, services, expectations, and real-life responsibilities.'
  },
  {
    id: 'level-six',
    title: 'Level 6',
    comingSoon: true,
    description: 'Tell stories, describe past experiences, and explain events clearly and naturally in spoken Cantonese.'
  },
]

const computedMe = computed(() => me.value)

const hasPaid = computed(() => {
  if (!authReady.value) return null // ⬅️ unknown
  return hasPaidAccess(me.value)
})

function isComingSoon(level: any) {
  return level.comingSoon === true
}

function canEnterLevel(level: any) {
  if (!authReady.value) return false
  return canAccessLevel(level.number, me.value) && !isComingSoon(level)
}

watchEffect(() => {
  console.log(
    'level 3',
    'authReady:', authReady.value,
    'me:', computedMe.value,
    'canEnter:', canEnterLevel({ number: 3, comingSoon: false })
  )
})

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

      <li v-for="quizLevel in quizLevels" :key="quizLevel.id" class="border rounded p-4 space-y-3 transition" :class="[
        quizLevel.comingSoon
          ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-80'
          : canAccessLevel(quizLevel.number, me)
            ? 'hover:bg-gray-50'
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

        <!-- Available & accessible -->
        <!-- <div v-if="canEnterLevel(quizLevel)" class="flex gap-3 pt-2">
          <NuxtLink :to="`/quiz/${quizLevel.id}/word/start-quiz`"
            class="flex-1 rounded border px-3 py-2 text-sm text-center hover:bg-gray-100">
            Word quiz
          </NuxtLink>

          <NuxtLink :to="`/quiz/${quizLevel.id}/audio/start-quiz`"
            class="flex-1 rounded border px-3 py-2 text-sm text-center hover:bg-gray-100">
            Audio quiz
          </NuxtLink>
        </div> -->

        <!-- Locked -->
        <!-- <div v-if="!canAccessLevel(quizLevel.number, me)" class="pt-2">
          <NuxtLink to="/upgrade/coming-soon" class="text-sm text-blue-500 hover:underline">
            Upgrade to unlock quiz
          </NuxtLink>
        </div> -->

        <!-- Available & accessible -->
        <!-- ✅ Available & accessible -->
        <div v-if="canEnterLevel(quizLevel)" class="flex gap-3 pt-2">
          <NuxtLink :to="`/quiz/${quizLevel.id}/word/start-quiz`"
            class="flex-1 rounded border px-3 py-2 text-sm text-center hover:bg-gray-100">
            Word quiz
          </NuxtLink>

          <NuxtLink :to="`/quiz/${quizLevel.id}/audio/start-quiz`"
            class="flex-1 rounded border px-3 py-2 text-sm text-center hover:bg-gray-100">
            Audio quiz
          </NuxtLink>
        </div>

        <!-- 🚧 Coming soon (paid OR free) -->
        <div v-else-if="isComingSoon(quizLevel)" class="pt-2 text-sm text-gray-400">
          Coming soon
        </div>

        <!-- 🔒 Locked (not paid) -->
        <!-- <div v-else class="pt-2">
          <NuxtLink to="/upgrade/coming-soon" class="text-sm text-blue-500 hover:underline">
            Upgrade to unlock quiz
          </NuxtLink>
        </div> -->
      </li>
    </ul>

  </main>
</template>
