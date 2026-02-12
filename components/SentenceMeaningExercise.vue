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

const wrongSelection = ref<string | null>(null)
const currentIndex = ref(0)
const selected = ref<string | null>(null)
const showResult = ref(false)

const currentSentence = computed(() => {
  return props.sentences[currentIndex.value]
})

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

const encouragingMessages = [
  "Nice work",
  "Good job — keep going",
  "That was solid practice",
  "Well done. This kind of repetition helps",
  "Another one done",
  "Good effort today",
  "You’re making steady progress",
  "That’s moving in the right direction",
  "This kind of practice adds up",
  "Well done — consistency matters",
  "You’re getting more comfortable with this",
  "That went well",
  "You’re building a real feel for it",
  "Each session makes the next easier",
  "Good focus there",
  "You showed up and practiced",
  "Nicely handled.",
  "That’s good progress",
  "Keep going"
]


function getRandomEncouragement(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)]
}

const encouragement = computed(() =>
  getRandomEncouragement(encouragingMessages)
)

const options = computed(() => {
  if (!currentSentence.value) return []

  const correct = currentSentence.value.meaning

  const distractors = props.allSentences
    .filter(s => s.id !== currentSentence.value.id)
    .map(s => s.meaning)

  const uniqueDistractors = shuffle(
    Array.from(new Set(distractors))
  ).slice(0, 3)

  return shuffle([correct, ...uniqueDistractors])
})

function selectOption(option: string) {
  if (showResult.value) return
  selected.value = option
  showResult.value = true

  if (option === currentSentence.value?.meaning) {
    playCorrectJingle()
  } else {
    wrongSelection.value = option
    playIncorrectJingle()
  }
}

function next() {
  selected.value = null
  wrongSelection.value = null
  showResult.value = false
  currentIndex.value++
}

const isCorrect = computed(() => {
  return selected.value === currentSentence.value?.meaning
})

const progressText = computed(() => {
  return `${currentIndex.value + 1} / ${props.sentences.length}`
})

const showEncouragement = ref(false)

watch(
  () => currentIndex.value,
  (i) => {
    if (i >= props.sentences.length) {
      setTimeout(() => {
        showEncouragement.value = true
      }, 300)
    }
  }
)


</script>

<template>

  <div v-if="currentSentence" class="max-w-xl mx-auto space-y-8">

    <!-- Prompt -->
    <div class="text-center space-y-2">
      <p class="text text-gray-500">What does this sentence mean?</p>

      <div class="text-center space-y-1">
        <p class="text-sm text-gray-400">
          {{ progressText }}
        </p>
        <div class="text-3xl font-medium">
          {{ currentSentence.text }}
        </div>
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

      <div class="min-h-[3.5rem]">
        <button v-if="showResult && currentIndex < props.sentences.length" class="w-full rounded-lg border border-gray-900 bg-gray-900
           px-4 py-3 text-center text-white transition hover:bg-gray-800" @click="next">
          Next →
        </button>
      </div>
    </div>
  </div>

  <!-- Done -->
  <div v-else class="text-center">

    <!-- Uses css styling -->
    <div class="mt-4 min-h-[2rem]">
      <Transition name="fade">
        <p v-if="showEncouragement" class="text-2xl text-black">
          {{ encouragement }}
        </p>
      </Transition>
    </div>

  </div>
</template>


<style scoped>
.fade-enter-active {
  transition: opacity 4s ease;
}

.fade-enter-from {
  opacity: 0;
}
</style>