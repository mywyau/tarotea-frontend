<script setup lang="ts">
import { Check, X } from '@lucide/vue'
import type { MissedQuestion } from '~/composables/useQuizResults'
import { tileColours } from '~/utils/branding/helpers'
import { shuffleFisherYates } from '~/utils/shuffle'
import { playCorrectJingle, playIncorrectJingle } from '~/utils/sounds'

const props = defineProps<{ questions: MissedQuestion[] }>()
const emit = defineEmits<{ close: [] }>()
const round = shallowRef(props.questions)
const missed = ref<MissedQuestion[]>([])
const index = ref(0)
const selected = ref<string | null>(null)
const question = computed(() => round.value[index.value])
const choices = computed(() => shuffleFisherYates(question.value?.choices ?? []))
const answerIsChinese = computed(() => /\p{Script=Han}/u.test(question.value?.correctAnswer ?? ''))
const heading = ref<HTMLElement | null>(null)
const { volume } = useAudioVolume()

function answer(choice: string) {
  if (!question.value || selected.value !== null) return
  selected.value = choice
  const correct = choice === question.value.correctAnswer
  if (!correct) missed.value.push(question.value)
  if (volume.value > 0) {
    if (correct) playCorrectJingle(0.8 * volume.value)
    else playIncorrectJingle(0.5 * volume.value)
  }
}

function next() {
  selected.value = null
  index.value++
}

function retryRemaining() {
  round.value = missed.value
  missed.value = []
  index.value = 0
  selected.value = null
}

onMounted(() => heading.value?.focus())
watch(question, () => heading.value?.focus(), { flush: 'post' })
</script>

<template>
  <section class="mx-auto max-w-xl space-y-5">
    <PracticeHeaderProgress label="Words" :current="Math.min(index + 1, round.length)" :total="round.length"
      :completed="index + (selected !== null ? 1 : 0)" progress-label="Missed-word practice progress" />
    <h1 ref="heading" tabindex="-1" class="text-2xl font-bold">
      {{ question ? 'Missed-word practice' : 'Practice complete' }}
    </h1>
    <template v-if="question">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 class="text-xl font-semibold" :class="{ 'w-full': selected !== null && answerIsChinese }">{{ question.prompt }}</h2>
        <p role="status" class="font-semibold" :class="{ 'sr-only': selected === null, 'order-last w-full': !answerIsChinese }">
          <template v-if="selected !== null">
            <span class="sr-only">{{ selected === question.correctAnswer ? 'Correct.' : 'Incorrect.' }}</span>
            Correct answer: <span :lang="answerIsChinese ? 'yue' : 'en'">{{ question.correctAnswer }}</span>
          </template>
        </p>
        <RecordingListenButton v-if="question.listening || selected !== null" :key="question.wordId"
          :file="question.audioFile" :autoplay="question.listening" variant="plain" />
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button v-for="(choice, i) in choices" :key="choice" type="button" :disabled="selected !== null"
          class="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 p-3 font-medium text-gray-900"
          :style="{ '--choice-colour': tileColours[i % tileColours.length] }"
          :class="selected !== null && choice === question.correctAnswer ? 'border-green-700 bg-green-100'
            : choice === selected ? 'border-red-700 bg-red-100' : 'border-transparent bg-[var(--choice-colour)]'"
          @click="answer(choice)">
          <Check v-if="selected !== null && choice === question.correctAnswer" class="h-5 w-5 shrink-0 text-green-800" aria-hidden="true" />
          <X v-else-if="choice === selected" class="h-5 w-5 shrink-0 text-red-800" aria-hidden="true" />
          {{ choice }}
        </button>
      </div>
      <AppButton v-if="selected !== null" @click="next">
        {{ index + 1 === round.length ? 'Finish practice' : 'Next word' }}
      </AppButton>
    </template>
    <template v-else>
      <p>You got <strong>{{ round.length - missed.length }} of {{ round.length }}</strong> right this round.</p>
      <AppButton v-if="missed.length" @click="retryRemaining">Practise remaining words</AppButton>
    </template>
    <div><AppButton variant="secondary" @click="emit('close')">Back to quiz results</AppButton></div>
  </section>
</template>
