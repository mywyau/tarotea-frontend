<script setup lang="ts">
import type { SentenceQuizQuestion } from '~/utils/quiz/buildSentenceQuiz'
import { brandColours } from '~/utils/branding/helpers'
import { shuffleFisherYates } from '~/utils/shuffle'

const props = defineProps<{
  question: SentenceQuizQuestion
  src: string
  xp: number
  xpDelta: number | null
  streak: number
  selectedIndex: number | null
}>()
const emit = defineEmits<{ answer: [index: number] }>()
const answered = computed(() => props.selectedIndex !== null)
const tileColors = shuffleFisherYates(brandColours).slice(0, 4)
</script>

<template>
  <div class="space-y-3 text-center">
    <h1 class="text-2xl font-semibold">Which word did you hear?</h1>
    <AudioButton :src="src" autoplay aria-label="Play sentence" />
  </div>
  <SentenceQuizTarget :answered="answered" :word="question.sourceWord" :jyutping="question.sourceWordJyutping"
    :xp="xp" :xp-delta="xpDelta" :streak="streak" />
  <div class="grid grid-cols-2 gap-4 w-full">
    <button v-for="(option, i) in question.options" :key="i"
      :disabled="answered" lang="zh-HK"
      class="rounded-xl flex items-center justify-center text-lg font-medium text-center p-5 select-none transition-all duration-200 ease-out shadow-sm active:scale-95"
      :style="{
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
      ]" @click="emit('answer', i)">
      {{ option }}
    </button>
  </div>

  <div v-if="answered" role="status" class="space-y-1 text-center">
    <p class="font-semibold">
      {{ selectedIndex === question.correctIndex ? 'Correct' : 'You heard' }} ·
      <span lang="zh-HK">{{ question.sourceWord }}</span>
      ({{ question.sourceWordJyutping }}) · {{ question.sourceWordMeaning }}
    </p>
    <p lang="zh-HK" class="text-xl">
      <template v-for="(part, i) in question.correctSentence.split(question.sourceWord)" :key="i"><mark
        v-if="i" class="rounded bg-taro-yellow/40 text-app-ink">{{ question.sourceWord }}</mark>{{ part }}</template>
    </p>
    <p class="text-sm text-app-muted">{{ question.jyutping }}</p>
    <p>{{ question.prompt }}</p>
  </div>
</template>
