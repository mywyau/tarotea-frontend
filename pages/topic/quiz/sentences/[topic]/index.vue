<script setup lang="ts">
definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: false,
})

import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'
import { computed, ref, watch } from 'vue'

import { brandColours } from '~/utils/branding/helpers'

import { buildSentenceQuiz } from '~/utils/quiz/buildSentenceQuiz'

type TopicSentenceItem = {
  sentenceId: string
  sentence: string
  jyutping: string
  meaning: string
  sourceWordId: string
  sourceWord: string
  sourceWordJyutping: string
  sourceWordMeaning: string
  tags: string[]
  sourceFile: string
}

type TopicSentenceData = {
  topic: string
  title: string
  totalWords: number
  totalSentences: number
  items: TopicSentenceItem[]
}

const route = useRoute()
const slug = computed(() => route.params.topic as string)

const { data } = await useFetch<TopicSentenceData>(
  () => `/api/sentences/topics/${slug.value}`,
  {
    key: () => `topic-sentences-${slug.value}`,
    server: true
  }
)

const sentenceItems = computed(() => data.value?.items ?? [])

const questions = computed(() =>
  sentenceItems.value.length
    ? buildSentenceQuiz(sentenceItems.value).slice(0, 20)
    : []
)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const showJyutping = ref(false)
const completionSoundPlayed = ref(false)

const question = computed(() => questions.value[current.value])

const animatedAccuracy = ref(0)
const completionAnimated = ref(false)

const accuracy = computed(() => {
  if (!questions.value.length) return 0
  return Math.round((score.value / questions.value.length) * 100)
})

const incorrectCount = computed(() => {
  return Math.max(0, questions.value.length - score.value)
})

const progressPercent = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  const position = Math.min(current.value + 1, total)
  return Math.round((position / total) * 100)
})

const hasQuestions = computed(() => questions.value.length > 0)

const quizFinished = computed(() => {
  return hasQuestions.value && current.value >= questions.value.length
})

const showQuiz = computed(() => {
  return hasQuestions.value && current.value < questions.value.length
})

const resultHeroClass = computed(() => {
  if (accuracy.value === 100) return 'result-3'
  if (accuracy.value >= 70) return 'result-0'
  if (accuracy.value >= 50) return 'result-2'
  return 'result-1'
})

const resultMeta = computed(() => {
  if (accuracy.value === 100) return { title: 'Perfect' }
  if (accuracy.value >= 70) return { title: 'Great job' }
  if (accuracy.value >= 50) return { title: 'Nice try' }
  return { title: 'Keep practicing' }
})

const tileColors = ref<string[]>([])

function generateTileColors() {
  tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

function resetCompletionAnimations() {
  animatedAccuracy.value = 0
  completionAnimated.value = false
}

function runCompletionAnimations() {
  animateCount(animatedAccuracy, accuracy.value, 2300)
}

async function answer(index: number) {
  if (answered.value) return
  if (!question.value) return

  selectedIndex.value = index
  answered.value = true

  const correct = index === question.value.correctIndex

  if (correct) {
    score.value++
    playCorrectJingle()
  } else {
    playIncorrectJingle()
  }
}

async function next() {
  answered.value = false
  selectedIndex.value = null
  showJyutping.value = false
  current.value++
}

const percentage = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  return (score.value / total) * 100
})

watch(
  () => question.value?.sentenceId,
  () => {
    generateTileColors()
  },
  { immediate: true }
)

watch(
  () => showQuiz.value,
  () => {
    showJyutping.value = false
  }
)

watch(
  () => quizFinished.value,
  (done) => {
    if (!done || completionSoundPlayed.value) return

    completionSoundPlayed.value = true

    setTimeout(() => {
      if (percentage.value >= 90) {
        playQuizCompleteFanfareSong()
      } else if (percentage.value >= 50) {
        playQuizCompleteOkaySong()
      } else {
        playQuizCompleteFailSong()
      }
    }, 250)
  }
)

watch(
  () => quizFinished.value,
  (done) => {
    if (!done || completionAnimated.value) return
    completionAnimated.value = true
    runCompletionAnimations()
  }
)

watch(
  () => slug.value,
  () => {
    current.value = 0
    score.value = 0
    answered.value = false
    selectedIndex.value = null
    showJyutping.value = false
    completionSoundPlayed.value = false
    resetCompletionAnimations()
  }
)
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-16 space-y-8">
    <NuxtLink v-if="current < questions.length" :to="`/topics/quiz`" class="text-black text-sm hover:underline">
      ← Back to topic quizzes
    </NuxtLink>

    <section class="text-center space-y-4">
      <h1 class="text-2xl font-semibold">
        {{ data?.title ?? 'Sentence Quiz' }}
      </h1>

      <div class="flex items-center gap-3 mb-6">
        <div v-if="(current + 1) <= questions.length" class="flex-1 bg-gray-200 rounded-full h-3">
          <div class="bg-purple-300 h-3 rounded-full transition-all duration-300"
            :style="{ width: progressPercent + '%' }" />
        </div>

        <span v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 whitespace-nowrap">
          {{ current + 1 }} / {{ questions.length }}
        </span>
      </div>

      <div v-if="showQuiz" class="space-y-6">

        <div class="space-y-3">
          <div class="flex flex-col items-center justify-center min-h-[120px]">
            <p class="text-2xl text-gray-900 leading-relaxed font-semibold text-center">
              {{ question.prompt }}
            </p>

            <!-- Show jyutping feature -->
            <!-- <div class="min-h-[28px] mt-2 flex items-center justify-center">
              <transition name="fade-scale">
                <p v-if="showJyutping" class="text-sm md:text-base text-gray-600 text-center">
                  {{ question.jyutping }}
                </p>
              </transition>
            </div>
          </div> -->

            <!-- <div>
            <button class="text-sm px-4 py-2 rounded-xl bg-white hover:brightness-110 transition"
              @click="showJyutping = !showJyutping">
              {{ showJyutping ? 'Hide Jyutping' : 'Show Jyutping' }}
            </button>
          </div> -->
          </div>

          <div class="grid grid-cols-1 gap-4">
            <button v-for="(option, i) in question.options" :key="i" class="rounded-xl flex items-center justify-center text-lg font-medium text-center p-5 select-none
              transition-all duration-200 ease-out shadow-sm active:scale-95" :style="{
                backgroundColor:
                  !answered
                    ? tileColors[i]
                    : i === question.correctIndex
                      ? '#BBF7D0'
                      : i === selectedIndex
                        ? '#FECACA'
                        : tileColors[i]
              }" :class="[
                !answered && 'hover:-translate-y-1 hover:shadow-lg hover:bg-gray-50 hover:brightness-110',
                answered && i === question.correctIndex && 'ring-2 ring-emerald-400',
                answered && i === selectedIndex && i !== question.correctIndex && 'animate-shake ring-2 ring-rose-400'
              ]" @click="answer(i)">
              {{ option }}
            </button>
          </div>

          <!-- <div
          v-if="answered"
          class="stat-card text-left result-2 space-y-2"
        >
          <p class="text-sm text-gray-700">
            Source word: <span class="font-semibold">{{ question.sourceWord }}</span>
          </p>
          <p class="text-sm text-gray-700">
            Meaning: <span class="font-semibold">{{ question.sourceWordMeaning }}</span>
          </p>
        </div> -->

          <div class="h-10">
            <button v-if="answered" class="w-full rounded-xl font-medium text-black py-2 hover:brightness-110"
              style="background-color:#F4C2D7;" @click="next">
              Next
            </button>
          </div>
        </div>
      </div>

      <transition name="fade-scale" mode="out-in">
        <div v-if="quizFinished" key="results" class="space-y-6">
          <transition name="card-fade" appear>
            <div class="stat-card hero-card" :class="resultHeroClass">
              <p class="stat-label">
                Sentence Quiz Complete
              </p>

              <h2 class="hero-title">
                {{ resultMeta.title }}
              </h2>

              <p class="hero-score">
                {{ animatedAccuracy }}%
              </p>

              <p class="hero-subtext">
                {{ score }} / {{ questions.length }} correct
              </p>
            </div>
          </transition>

          <transition-group name="card-fade" tag="div" class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div class="stat-card hover:brightness-110 result-0">
              <p class="stat-label">Correct</p>
              <p class="stat-value">{{ score }}</p>
            </div>

            <div class="stat-card hover:brightness-110 result-1">
              <p class="stat-label">Incorrect</p>
              <p class="stat-value">{{ incorrectCount }}</p>
            </div>
          </transition-group>

          <div class="pt-2 space-y-3">
            <NuxtLink :to="`/topics/quiz`"
              class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:#A8CAE0;">
              Play Again
            </NuxtLink>

            <NuxtLink :to="`/topic/words/${slug}`"
              class="block w-full rounded-xl bg-white text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:rgba(244,205,39,0.35);">
              Back to Topic
            </NuxtLink>
          </div>
        </div>
      </transition>
    </section>
  </main>
</template>

<style scoped>
.card-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.stat-card {
  border-radius: 22px;
  padding: 1.5rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 0.75rem;
  color: #111827;
}

.result-0 {
  background: rgba(168, 202, 224, 0.45);
}

.result-1 {
  background: rgba(246, 225, 225, 0.75);
}

.result-2 {
  background: rgba(244, 205, 39, 0.35);
}

.result-3 {
  background: rgba(168, 224, 182, 0.45);
}

.hero-card {
  padding: 2rem 1.5rem;
}

.hero-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 0.35rem;
  color: #111827;
}

.hero-score {
  font-size: 3rem;
  line-height: 1;
  font-weight: 600;
  margin-top: 0.9rem;
  color: #111827;
}

.hero-subtext {
  margin-top: 0.65rem;
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.68);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>