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
    title: 'Listen to sentence audio first',
    body: 'Each question includes audio for the sentence. Replay if needed before answering.',
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets streak for that word and applies a 12 XP penalty.',
  },
  {
    title: 'Finish to keep your rewards',
    body: 'Your session stats and XP finalize at the end of the quiz.',
  },
]

const scoringTips = [
  'Streaks are tracked per source word.',
  'Lower-XP words appear more often.',
  'Correct answers earn increasing XP with streaks.',
  'Streak bonus caps after 5 correct answers in a row.',
  'Questions are randomized every run.',
  'This mode emphasizes listening + sentence meaning recognition.',
]


const canEnterLevel = () => true
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-8 space-y-8">
    <div class="mb-4">
      <BackLink />
    </div>

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
        Sentence Audio Quiz
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/quiz/${slug}/sentences/audio/v3`" class="start-btn">
          Start Quiz
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
  background: rgb(249, 166, 166);
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: rgb(204, 136, 136);
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
