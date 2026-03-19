<script setup lang="ts">

definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: false
})

import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()

const slug = route.params.slug as string

if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const {
  authReady,
  isLoggedIn,
  entitlement,
  resolve,
} = useMeStateV2()



watchEffect(() => {
  if (slug && levelNumber === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Topic not found'
    })
  }
})

// --- helpers ---

const canEnterTopic = () => {

  if (!authReady.value) return false

  // Paid levels
  if (!isLoggedIn.value) return false

  return canAccessLevel(entitlement.value!)
}

</script>

<template>
  <main class="max-w-xl mx-auto px-4 py-16 space-y-10">

    <NuxtLink :to="`/quiz/`" class="text-sm text-gray-500 hover:underline">
      ← All quizzes
    </NuxtLink>

    <!-- 🔒 Locked -->
    <section v-if="(authReady && !canEnterLevel())" class="text-center space-y-4">
      <h1 class="text-2xl font-semibold">Quiz locked</h1>
      <p class="text-gray-600">
        Quizzes are part of TaroTeaMonthly or TaroTeaYearly.
      </p>
      <p class="text-gray-500 text-sm">
        Sign in and upgrade to unlock advanced levels as they’re released.
      </p>
    </section>

    <!-- ✅ Quiz intro -->
    <section v-else class="text-center space-y-6">

      <div class="text-4xl">📝</div>

      <h1 class="text-3xl font-semibold">
        Level {{ levelNumber }} Word Quiz
      </h1>

      <p class="text-gray-600">
        Test your understanding of the words from this level.
      </p>

      <ul class="text-left text-gray-700 space-y-2 max-w-sm mx-auto">
        <li>XP is awarded when you complete the quiz</li>
        <li>• Your weakest words will tend to appear more often</li>
        <li>• Streaks gain you more xp per answer</li>
        <li>• Randomised questions</li>
        <li>• Cantonese ↔ English</li>
      </ul>

      <NuxtLink :to="`/quiz/${slug}/word/testV3`" class="block mt-6 w-full rounded-lg bg-black text-white py-3 font-medium
         text-center hover:bg-gray-800 transition">
        Start quiz
      </NuxtLink>

      <div class="mt-8">
        <NuxtLink :to="`/level/${slug}`" class="text-gray-500 hover:underline">
          ← Level {{ levelNumber }} Vocab
        </NuxtLink>
      </div>

    </section>

  </main>
</template>
