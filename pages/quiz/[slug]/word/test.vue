<script setup lang="ts">

definePageMeta({
  middleware: ['level-access']
})

import { generateQuiz } from '@/utils/quiz/generateQuiz'
import { levelOneWords } from '@/utils/quiz/levelOneWords'
import { computed, ref } from 'vue'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const questions = ref(generateQuiz(levelOneWords))
const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const question = computed(() => questions.value[current.value])

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

    <h1 class="text-2xl font-semibold text-center">
      Level 1 Quiz
    </h1>

    <p v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 text-center">
      Question {{ current + 1 }} / {{ questions.length }}
    </p>

    <div v-if="current < questions.length" class="space-y-6">

      <p class="text-center text-4xl">
        {{ question.prompt }}
      </p>

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
        You scored {{ score === questions.length
          ? '100%'
          : ((score / questions.length) * 100).toFixed(2) + '%' }}
      </p>

      <div class="pt-4 space-y-4">
        <NuxtLink :to="`/quiz/${slug}/word/start-quiz`" class="block text-sm text-gray-400 hover:underline">
          Back to Start
        </NuxtLink>

        <NuxtLink :to="`/level/${slug}`" class="block text-sm text-gray-400 hover:underline">
          Back to Level
        </NuxtLink>
      </div>
    </div>

  </main>
</template>
