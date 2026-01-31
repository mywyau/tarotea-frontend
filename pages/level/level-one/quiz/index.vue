<script setup lang="ts">

import { generateQuiz } from '@/utils/quiz/generateQuiz'
import { levelOneWords } from '@/utils/quiz/levelOneWords'
import { computed, ref } from 'vue'

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
  if (index === question.value.correctIndex) score.value++
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

      <p class="text-center text-xl">
        {{ question.prompt }}
      </p>

      <div class="space-y-3">
        <button v-for="(option, i) in question.options" :key="i"
          class="w-full rounded border py-2 px-4 text-left text-lg" :class="{
            'bg-green-100 border-green-500':
              answered && i === question.correctIndex,
            'bg-red-100 border-red-500':
              answered && i === selectedIndex && i !== question.correctIndex
          }" @click="answer(i)">
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

      <NuxtLink to="/level/level-one" class="text-sm text-blue-600 hover:underline">
        Back to Level 1
      </NuxtLink>
    </div>

  </main>
</template>
