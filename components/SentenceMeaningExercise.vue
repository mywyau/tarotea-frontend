<script setup lang="ts">

import { computed, ref } from 'vue';

interface Sentence {
  id: string
  text: string
  meaning: string
}

const props = defineProps<{
  sentences: Sentence[]
  allSentences: Sentence[] // broader pool for distractors
}>()

const currentIndex = ref(0)
const selected = ref<string | null>(null)
const showResult = ref(false)

const currentSentence = computed(() => {
  return props.sentences[currentIndex.value]
})

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

const options = computed(() => {
  if (!currentSentence.value) return []

  const correct = currentSentence.value.meaning

  const distractors = props.allSentences
    .filter(s => s.id !== currentSentence.value.id)
    .map(s => s.meaning)

  const uniqueDistractors = Array.from(new Set(distractors))
    .slice(0, 3)

  return shuffle([correct, ...uniqueDistractors])
})

function selectOption(option: string) {
  if (showResult.value) return
  selected.value = option
  showResult.value = true

  if (option === currentSentence.value?.meaning) {
    playCorrectJingle()
  } else {
    playIncorrectJingle()
  }
}

function next() {
  selected.value = null
  showResult.value = false
  currentIndex.value++
}

const isCorrect = computed(() => {
  return selected.value === currentSentence.value?.meaning
})
</script>

<template>

  <div v-if="currentSentence" class="max-w-xl mx-auto space-y-8">

    <!-- Prompt -->
    <div class="text-center space-y-2">
      <p class="text text-gray-500">What does this sentence mean?</p>
      <div class="text-3xl font-medium">
        {{ currentSentence.text }}
      </div>
    </div>

    <!-- Options -->
    <div class="grid gap-3">
      <button v-for="option in options" :disabled="showResult" :key="option" class="rounded-lg border px-4 py-3 text-left transition disabled:opacity-60 disabled:cursor-not-allowed
               hover:bg-gray-50" :class="{
                'bg-green-100': showResult && option === currentSentence.meaning,
                'bg-red-100 animate-shake': showResult && option === selected && !isCorrect
              }" @click="selectOption(option)">
        {{ option }}
      </button>

      <button v-if="showResult" class="w-full rounded-lg border border-gray-900 bg-gray-900
         px-4 py-3 text-center text-white transition hover:bg-gray-800" @click="next">
        Next →
      </button>
    </div>
  </div>

  <!-- Done -->
  <div v-else class="text-center">
    <h2 class="text-2xl font-semibold">Nice work</h2>
    <p class="text-gray-500 mt-2">You’ve finished this set.</p>
  </div>
</template>
