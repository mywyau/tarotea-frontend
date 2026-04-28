<script setup lang="ts">

import { levelSelectMetaData } from '@/utils/levels/helpers'
import { onMounted, reactive } from 'vue'


const {
  authReady,
  resolve,
} = useMeStateV2()

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

// const canEnterLevel = (level: any) => {

//   if (isComingSoon(level)) return false

//   if (isFreeLevel(level.number)) return true

//   return canAccessLevelQuiz(level, entitlement.value!)
// }

const canEnterLevel = (level: any) => {

  return true
}

const quizModes = [
  { label: 'Vocabulary', class: 'level-btn-blue', to: (id: string) => `/quiz/${id}/word/start-quiz` },
  { label: 'Audio', class: 'level-btn-purple', to: (id: string) => `/quiz/${id}/audio/start-quiz` },
  { label: 'Sentences', class: 'level-btn-yellow', to: (id: string) => `/quiz/${id}/sentences/no-audio/v3/start-quiz` },
  { label: 'Sentence Audio Only', class: 'level-btn-blush', to: (id: string) => `/quiz/${id}/sentences/audio/v3/start-quiz` },
  { label: 'Echo Gecko', class: 'level-btn-green', to: (id: string) => `/quiz/${id}/echo-gecko` },
]

const activeQuizModeByLevel = reactive<Record<string, number>>({})

const getActiveQuizMode = (levelId: string) => {
  const idx = activeQuizModeByLevel[levelId] ?? 0
  return quizModes[idx]
}

const cycleQuizMode = (levelId: string, direction: 'prev' | 'next') => {
  const current = activeQuizModeByLevel[levelId] ?? 0
  const delta = direction === 'next' ? 1 : -1
  activeQuizModeByLevel[levelId] = (current + delta + quizModes.length) % quizModes.length
}

</script>

<template>
  <main class="levels-page max-w-4xl mx-auto py-8 px-4 space-y-8">

    <div class="mb-4">
      <BackLink />
    </div>

    <!-- Header -->
    <header class="text-center space-y-3 max-w-4xl mx-auto">
      <h1 class="font-semibold level-heading">
        Level Quiz
      </h1>
      <p class="text-gray-600 text-sm sm:text-base level-subheading">
        Progress through structured and progressively trickier Cantonese content.
      </p>
    </header>

    <!-- Grid -->
    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6">

      <li v-for="quizLevel in levelSelectMetaData" :key="quizLevel.id" class="level-card" :class="[
        quizLevel.comingSoon
          ? 'level-locked'
          : (!canEnterLevel(quizLevel) ? 'level-locked' : '')
      ]">

        <!-- Title -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ quizLevel.title }}
          </h2>

          <p class="text-sm text-gray-600 leading-relaxed">
            {{ quizLevel.description }}
          </p>

          <p v-if="quizLevel.comingSoon" class="text-xs text-gray-400 font-medium">
            Coming soon
          </p>
        </div>

        <!-- Quiz Mode Cycler -->
        <div v-if="canEnterLevel(quizLevel) && !quizLevel.comingSoon" class="grid grid-cols-2 gap-3 pt-4">
          <button class="cycle-btn" @click="cycleQuizMode(quizLevel.id, 'prev')">
            ←
          </button>

          <button class="cycle-btn" @click="cycleQuizMode(quizLevel.id, 'next')">
            →
          </button>

          <NuxtLink
            :to="getActiveQuizMode(quizLevel.id).to(quizLevel.id)"
            class="level-btn col-span-2"
            :class="getActiveQuizMode(quizLevel.id).class"
          >
            {{ getActiveQuizMode(quizLevel.id).label }}
          </NuxtLink>

          <p class="quiz-mode-indicator col-span-2">
            {{ (activeQuizModeByLevel[quizLevel.id] ?? 0) + 1 }} / {{ quizModes.length }}
          </p>
        </div>

        <!-- Locked -->
        <p v-else-if="!quizLevel.comingSoon" class="text-xs text-center text-gray-500 pt-4">
          Upgrade to unlock
        </p>

      </li>

    </ul>

  </main>
</template>

<style scoped>
.levels-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

/* Card */
.level-card {
  border-radius: 20px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.level-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.level-locked {
  opacity: 0.6;
}

/* Buttons */
.level-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 52px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.2;
  transition: all 0.15s ease;
}

.cycle-btn {
  min-height: 44px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
  background: rgba(17, 24, 39, 0.08);
  color: #111827;
  transition: background 0.15s ease;
}

.cycle-btn:hover {
  background: rgba(17, 24, 39, 0.16);
}

.quiz-mode-indicator {
  font-size: 0.7rem;
  text-align: center;
  color: rgba(17, 24, 39, 0.7);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Colour variations */
.level-btn-blue {
  background: rgba(168, 202, 224, 0.45);
  color: #1f2937;
}

.level-btn-blue:hover {
  background: rgba(168, 202, 224, 0.65);
}

.level-btn-purple {
  background: rgba(214, 163, 209, 0.45);
  color: #1f2937;
}

.level-btn-purple:hover {
  background: rgba(214, 163, 209, 0.65);
}

.level-btn-yellow {
  background: rgba(244, 205, 39, 0.45);
  color: #1f2937;
}

.level-btn-yellow:hover {
  background: rgba(244, 205, 39, 0.65);
}

.level-btn-blush {
  background: rgb(249, 166, 166);
  color: #1f2937;
}

.level-btn-blush:hover {
  background: rgb(204, 136, 136);
}

.level-btn-green {
  background: rgba(205, 232, 201, 0.7);
  color: #1f2937;
}

.level-btn-green:hover {
  background: rgba(192, 223, 188, 0.85);
}

</style>
