<script setup lang="ts">
definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: false
})

import { createError } from 'h3'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const {
  authReady,
} = useMeStateV2()

watchEffect(() => {
  if (topicSlug === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Topic not found'
    })
  }
})

const primaryTips = [
  {
    title: 'Listen first, then choose the meaning',
    body: 'Each question plays Cantonese audio. Focus on recognising the word before answering.'
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets that word’s streak and reduces the current XP gained for that word by 12.'
  },
  {
    title: 'Finish the quiz to receive XP',
    body: 'XP is only awarded at the end of the quiz, so try to complete every session.'
  }
]

const scoringTips = [
  'Streaks are tracked separately for each word.',
  'Lower XP or weaker words will appear more often.',
  'Earn at least 5 XP for every correct answer.',
  'Answer streaks increase the XP you earn.',
  'Streaks cap at 5 correct answers in a row for a given word.',
  'Streak XP: 5 → 7 → 9 → 13 → 15.',
  'Questions are randomized every session.',
  'This quiz focuses on listening and recognition.',
  'Replay the audio carefully before choosing your answer.',
]


const canEnterTopic = () => {
  return true
}

</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <!-- <NuxtLink :to="`/quiz/`" class="text-sm text-black hover:underline">
      ← Back
    </NuxtLink> -->

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
        Audio Quiz
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/topic/quiz/vocabulary/audio/v5/${topicSlug}`" class="start-btn">
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

.quiz-intro-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
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
  background: #EAB8E4;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #d9a6d3;
  transform: translateY(-2px);
}

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


@media (max-width: 640px) {
  .quiz-card {
    padding: 1.5rem;
  }
}
</style>
