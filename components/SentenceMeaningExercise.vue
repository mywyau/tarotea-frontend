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

const BRAND_COLORS = [
  '#EAB8E4',
  '#A8CAE0',
  '#F4C2D7',
  '#F2CACA',
  '#D6A3D1',
  'rgba(244,205,39,0.35)',
]

const tileColors = ref<string[]>([])

function generateTileColors() {
  tileColors.value = shuffle(BRAND_COLORS).slice(0, 4)
}

watch(
  () => currentIndex.value,
  () => {
    generateTileColors()
  },
  { immediate: true }
)

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

  <div v-if="currentSentence" class="max-w-xl mx-auto px-4 py-8 space-y-10">

    <!-- Prompt -->
    <div class="text-center space-y-3">

      <p class="text-sm text-gray-500 uppercase tracking-wide">
        What does this sentence mean?
      </p>

      <p class="text-3xl sm:text-4xl font-semibold leading-relaxed">
        {{ currentSentence.text }}
      </p>

    </div>

    <!-- Progress -->
    <div class="space-y-3">

      <div class="flex items-center gap-3">

        <div class="flex-1 bg-gray-200 rounded-full h-3">
          <div class="bg-purple-300 h-3 rounded-full transition-all duration-300" :style="{
            width: ((currentIndex + 1) / props.sentences.length) * 100 + '%'
          }" />
        </div>

        <span class="text-sm text-gray-500 whitespace-nowrap">
          {{ progressText }}
        </span>

      </div>

    </div>

    <!-- Options -->
    <div class="grid gap-4">

      <button v-for="(option, i) in options" :key="option" :disabled="showResult" @click="selectOption(option)" class="rounded-xl px-6 py-4 text-left
               transition-all duration-300 ease-out
               shadow-sm active:scale-95 hover:brightness-110
               disabled:opacity-70 disabled:cursor-not-allowed" :style="{
                backgroundColor:
                  !showResult
                    ? tileColors[i]
                    : option === currentSentence.meaning
                      ? '#BBF7D0'
                      : option === selected
                        ? '#FECACA'
                        : tileColors[i]
              }" :class="[
                showResult && option === currentSentence.meaning && 'ring-2 ring-emerald-400',
                showResult && option === selected && !isCorrect && 'animate-shake ring-2 ring-rose-400'
              ]">
        {{ option }}
      </button>

      <!-- Next -->
      <div class="min-h-[3.5rem]">
        <button v-if="showResult && currentIndex < props.sentences.length" class="w-full rounded-lg bg-black text-white py-3
                 font-medium transition hover:bg-gray-800" @click="next">
          Next →
        </button>
      </div>

    </div>

  </div>

  <!-- Completion -->
  <div v-else class="max-w-xl mx-auto px-4 py-20 text-center space-y-8">

    <h2 class="text-2xl font-semibold">
      Session Complete
    </h2>

    <Transition name="fade">
      <p v-if="showEncouragement" class="text-xl text-gray-800">
        {{ encouragement }}
      </p>
    </Transition>

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