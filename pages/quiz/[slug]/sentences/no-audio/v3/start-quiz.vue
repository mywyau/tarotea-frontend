<script setup lang="ts">
definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false,
})

import { createError } from 'h3'
import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = route.params.slug as string

if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const { authReady } = useMeStateV2()

watchEffect(() => {
  if (slug && levelNumber === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found',
    })
  }
})

const primaryTips = [
  {
    title: 'Read the sentence, then pick the meaning',
    body: 'Each question shows a Cantonese sentence and 4 English choices.',
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets streak for that word and applies a 12 XP penalty.',
  },
  {
    title: 'Finish the full quiz to save results',
    body: 'Your XP and stats are finalized when the quiz finishes.',
  },
]

const scoringTips = [
  'Streaks are tracked per source word.',
  'Lower-XP words appear more often.',
  'Correct answers earn increasing XP with streaks.',
  'Streak bonus caps after 5 correct answers in a row.',
  'Questions are randomized every run.',
  'This mode focuses on sentence reading and meaning recognition.',
]


const canEnterLevel = () => true
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <BackLink />

    <section v-if="authReady && !canEnterLevel()" class="quiz-card text-center space-y-4">
      <h1 class="text-2xl font-semibold text-gray-900">
        Quiz locked
      </h1>

      <p class="text-black">
        This quiz is part of TaroTea Monthly or Yearly.
      </p>

      <p class="text-sm text-black">
        Sign in and upgrade to unlock advanced levels.
      </p>

      <NuxtLink to="/upgrade" class="upgrade-btn mt-4 inline-block">
        Upgrade
      </NuxtLink>
    </section>

    <section v-else class="quiz-card text-center space-y-6">
      <h1 class="text-3xl font-semibold text-gray-900 level-heading">
        Level {{ levelNumber }}
      </h1>

      <p class="text-black level-subheading">
        Sentence based quiz.
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/quiz/${slug}/sentences/no-audio/v3`" class="start-btn">
          Start quiz
        </NuxtLink>
      </div>

      <QuizStartTips :primary-tips="primaryTips" :scoring-tips="scoringTips" />
    </section>
  </main>
</template>

<style scoped>
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

.quiz-card {
  border-radius: 26px;
  padding: 2rem;
}

.start-btn {
  display: block;
  width: 100%;
  border-radius: 16px;
  padding: 0.75rem;
  font-weight: 600;
  text-align: center;
  background: rgba(244, 205, 39, 0.45);
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: rgba(244, 205, 39, 0.65);
  transform: translateY(-2px);
}

.upgrade-btn {
  border-radius: 16px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  background: #EAB8E4;
  color: #111827;
}


</style>
