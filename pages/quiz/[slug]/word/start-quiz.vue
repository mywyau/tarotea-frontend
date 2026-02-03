<script setup lang="ts">

import { canAccessLevel } from '@/utils/canAccessLevel'
import { getLevelNumber } from '@/utils/levels'

// definePageMeta({
//   middleware: ['level-access']
// })

const route = useRoute()
const slug = computed(() => route.params.slug as string | undefined)

const levelNumber = computed(() => {
  if (!slug.value) return null
  return getLevelNumber(slug.value)
})

watchEffect(() => {
  if (slug.value && levelNumber.value === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found'
    })
  }
})

const { me, authReady } = useMeState()

const hasAccess = computed(() =>
  authReady.value &&
  levelNumber.value !== null &&
  canAccessLevel(levelNumber.value, me.value)
)

</script>

<template>
  <main class="max-w-xl mx-auto px-4 py-16 space-y-10">

    <!-- 🔒 Locked -->
    <section v-if="authReady && !hasAccess" class="text-center space-y-4">
      <h1 class="text-2xl font-semibold">🔒 Quiz locked</h1>
      <p class="text-gray-600">
        Quizzes are part of TaroTeaMonthly or TaroTeaYearly.
      </p>
      <p class="text-gray-500 text-sm">
        Sign in and upgrade to unlock advanced levels as they’re released.
      </p>
    </section>

    <!-- ✅ Quiz intro -->
    <section class="text-center space-y-6">

      <div class="text-4xl">📝</div>

      <h1 class="text-3xl font-semibold">
        Level {{ levelNumber }} Word Quiz
      </h1>

      <p class="text-gray-600">
        Test your understanding of the words from this level.
      </p>

      <ul class="text-left text-gray-700 space-y-2 max-w-sm mx-auto">
        <li>• Randomised questions</li>
        <li>• Cantonese ↔ English</li>
      </ul>

      <NuxtLink :to="`/quiz/${slug}/word/test`" class="block mt-6 w-full rounded-lg bg-black text-white py-3 font-medium
         text-center hover:bg-gray-800 transition">
        Start quiz
      </NuxtLink>

      <NuxtLink :to="`/quiz/`" class="block text-gray-500 hover:underline">
        ← All quizzes
      </NuxtLink>

      <NuxtLink :to="`/level/${slug}`" class="block text-gray-500 hover:underline">
        ← Level {{ levelNumber }} Vocab
      </NuxtLink>

    </section>

  </main>
</template>
