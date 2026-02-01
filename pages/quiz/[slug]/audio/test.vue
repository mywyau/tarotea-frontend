<script setup lang="ts">

definePageMeta({
  middleware: ['level-access']
})

import { computed, ref } from 'vue'

import { generateAudioQuiz } from '@/utils/quiz/generateAudioQuiz'
import { LEVEL_WORDS } from '@/utils/quiz/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const wordsForLevel = computed(() => {
  return LEVEL_WORDS[slug.value as keyof typeof LEVEL_WORDS] ?? null
})

const questions = computed(() =>
  wordsForLevel.value
    ? generateAudioQuiz(wordsForLevel.value)
    : []
)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const question = computed(() => questions.value[current.value])

const { me, authReady } = useMeState()
const levelNumber = getLevelNumber(slug.value)

const hasAccess = computed(() =>
  canAccessLevel(levelNumber, me.value)
)

const LEVEL_TITLES: Record<string, string> = {
  'level-one': 'Level 1',
  'level-two': 'Level 2',
  'level-three': 'Level 3',
  'level-four': 'Level 4',
  'level-five': 'Level 5',
  'level-six': 'Level 6',
  'level-seven': 'Level 7',
  'level-eight': 'Level 8',
  'level-nine': 'Level 9',
  'level-ten': 'Level 10',
  'level-eleven': 'Level 11',
  'level-twelve': 'Level 12',
  'level-thirteen': 'Level 13',
  'level-fourteen': 'Level 14',
  'level-fiftheen': 'Level 15',
}

function answer(index: number) {
  if (answered.value) return
  selectedIndex.value = index
  answered.value = true
  if (index === question.value.correctIndex) {
    score.value++
    playCorrectJingle() // ✅ here
  } else {
    playIncorrectJingle()
  }
}

function next() {
  answered.value = false
  selectedIndex.value = null
  current.value++
}

</script>

<template>

  <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

    <section v-if="authReady && !hasAccess" class="text-center space-y-4">
      <h1 class="text-2xl font-semibold">🔒 Quiz locked</h1>
      <p class="text-gray-600">
        Quizzes are part of Tarotea Pro.
      </p>
      <NuxtLink to="/upgrade/coming-soon" class="text-sm text-blue-600 hover:underline">
        Upgrade to unlock
      </NuxtLink>
    </section>

    <section v-else class="text-center space-y-4">

      <h1 class="text-2xl font-semibold text-center">
        {{ LEVEL_TITLES[slug] ?? 'Unknown level' }}
      </h1>

      <p v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 text-center">
        Question {{ current + 1 }} / {{ questions.length }}
      </p>

      <div v-if="current < questions.length" class="space-y-6">

        <div v-if="question.type === 'audio'" class="text-center">
          <AudioButton :key="question.audioKey" :src="`${cdnBase}/audio/${question.audioKey}`" autoplay />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button v-for="(option, i) in question.options" :key="i" class="aspect-square rounded-lg border flex items-center justify-center
           text-2xl font-medium text-center p-6 transition" :class="[
            !answered && 'hover:bg-gray-100',
            {
              'bg-green-100':
                answered && i === question.correctIndex,
              'bg-red-100':
                answered && i === selectedIndex && i !== question.correctIndex
            }
          ]" @click="answer(i)">
            {{ option }}
          </button>
        </div>

        <button v-if="answered" class="w-full mt-4 rounded bg-black text-white py-2" @click="next">
          Next
        </button>

      </div>

      <div v-else class="text-center space-y-6">

        <h2 class="text-2xl font-semibold">
          🎉 Quiz complete
        </h2>

        <p class="text-gray-600">
          You scored {{ score }} / {{ questions.length }} - {{ (score / questions.length) * 100 }}%
        </p>

        <NuxtLink :to="`/level/${slug}`" class="text-sm text-blue-600 hover:underline">
          Back to Level 
        </NuxtLink>
      </div>
    </section>

  </main>
</template>
