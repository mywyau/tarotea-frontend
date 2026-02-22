<script setup lang="ts">

definePageMeta({
  middleware: ['level-access'],
  ssr: false
})

import { getLevelNumber } from '@/utils/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string | undefined)

const levelNumber = computed(() => {
  if (!slug.value) return null
  return getLevelNumber(slug.value)
})

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()


const canEnterLevel = () => {

  if (!authReady.value) return false

  if (levelNumber.value! <= 2) return true

  // Paid levels
  if (!isLoggedIn.value) return false

  return canAccessLevel(entitlement.value!)
}

watchEffect(() => {
  if (slug.value && levelNumber.value === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found'
    })
  }
})

</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <NuxtLink :to="`/quiz/`" class="text-base text-gray-600 hover:underline">
      ← All quizzes
    </NuxtLink>

    <!-- 🔒 Locked -->
    <section v-if="authReady && !canEnterLevel()" class="quiz-card text-center space-y-4">
    
      <h1 class="text-2xl font-semibold text-gray-900">
        Quiz locked
      </h1>

      <p class="text-gray-600">
        This quiz is part of TaroTea Monthly or Yearly.
      </p>

      <p class="text-sm text-gray-500">
        Sign in and upgrade to unlock advanced levels.
      </p>

      <NuxtLink to="/upgrade" class="upgrade-btn mt-4 inline-block">
        Upgrade
      </NuxtLink>
    </section>

    <!-- ✅ Quiz intro -->
    <section v-else class="quiz-card text-center space-y-6">

      <h1 class="text-3xl font-semibold text-gray-900">
        Level {{ levelNumber }} Audio Quiz
      </h1>

      <p class="text-gray-600">
        Test your listening skills from this level.
      </p>

      <ul class="features-list text-base">
        <li>XP awarded on completion</li>
        <li>Cantonese audio, English answers</li>
        <li>Weakest words appear more often</li>
        <li>Randomised questions</li>
      </ul>

      <NuxtLink :to="`/quiz/${slug}/audio/testV3`" class="start-btn">
        Start quiz
      </NuxtLink>

      <div class="pt-6">
        <NuxtLink :to="`/level/${slug}`" class="text-sm text-gray-600 hover:underline">
          ← Level {{ levelNumber }} Vocab
        </NuxtLink>
      </div>

    </section>

  </main>
</template>

<style scoped>
.quiz-intro-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

/* Main card */
.quiz-card {
  border-radius: 26px;
  padding: 2rem;
  /* background: #F6E1E1; */
}

/* Feature list */
.features-list {
  text-align: left;
  max-width: 22rem;
  margin: 0 auto;
  color: #374151;
  /* font-size: 0.9rem; */
  line-height: 1.6;
  list-style: none;
  padding: 0;
}

.features-list li {
  padding-left: 1.2rem;
  position: relative;
}

.features-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #D6A3D1;
}

/* Start button */
.start-btn {
  display: block;
  width: 100%;
  border-radius: 16px;
  padding: 0.75rem;
  font-weight: 600;
  text-align: center;
  background: #A8CAE0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
  transform: translateY(-2px);
}

/* Upgrade button */
.upgrade-btn {
  border-radius: 16px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  background: #EAB8E4;
  color: #111827;
  transition: background 0.15s ease;
}

.upgrade-btn:hover {
  background: #d9a6d3;
}

/* Mobile spacing */
@media (max-width: 640px) {
  .quiz-card {
    padding: 1.5rem;
  }
}
</style>
