<script setup lang="ts">
definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: false,
})

import { createError } from 'h3'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const {
  authReady,
} = useMeStateV2()

watchEffect(() => {
  if (!topicSlug.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Topic not found',
    })
  }
})

const primaryTips = [
  {
    title: 'Gain XP to unlock word tiles using TaroKeys',
    body: 'Every correct answer gives XP and helps build up your TaroKeys.',
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets that word streak and applies a 12 XP penalty.',
  },
  {
    title: 'Finish to save your progress',
    body: 'XP and stats are finalized once the quiz completes.',
  },
]

const scoringTips = [
  'Streaks are tracked separately for each word.',
  'Lower-XP words will appear more often.',
  'Earn at least 5 XP for every correct answer.',
  'Answer streaks increase the XP you earn.',
  'Streaks cap at 5 correct answers in a row for a given word.',
  'Streak XP: 5 → 7 → 9 → 13 → 15.',
  'Questions are randomized every session.',
  'Practice Cantonese → English and English → Cantonese.',
  'Audio plays after each answer to reinforce pronunciation.',
]


const canEnterTopic = () => {
  return true
}
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <BackLink />

    <section v-if="authReady && !canEnterTopic()" class="quiz-card text-center space-y-4">
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
        {{ topicSlug }}
      </h1>

      <p class="text-black level-subheading">
        Vocabulary Quiz
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/topic/quiz/vocabulary/word/v5/${topicSlug}`" class="start-btn">
          Start
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
  background: #A8CAE0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
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
