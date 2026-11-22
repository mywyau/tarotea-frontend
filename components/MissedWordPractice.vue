<script setup lang="ts">
import type { MissedQuestion } from '~/composables/useQuizResults'
import { shuffleFisherYates } from '~/utils/shuffle'

const props = defineProps<{ questions: MissedQuestion[] }>()
const emit = defineEmits<{ close: [] }>()
const round = shallowRef(props.questions)
const missed = ref<MissedQuestion[]>([])
const index = ref(0)
const selected = ref<string | null>(null)
const question = computed(() => round.value[index.value])
const choices = computed(() => shuffleFisherYates(question.value?.choices ?? []))
const heading = ref<HTMLElement | null>(null)

function answer(choice: string) {
  if (!question.value || selected.value !== null) return
  selected.value = choice
  if (choice !== question.value.correctAnswer) missed.value.push(question.value)
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
    <h1 ref="heading" tabindex="-1" class="text-2xl font-bold">
      {{ question ? 'Missed-word practice' : 'Practice complete' }}
    </h1>
    <template v-if="question">
      <p class="text-sm text-app-muted">Word {{ index + 1 }} of {{ round.length }}</p>
      <h2 class="text-xl font-semibold">{{ question.prompt }}</h2>
      <RecordingListenButton v-if="question.listening || selected !== null" :key="question.wordId"
        :file="question.audioFile" :autoplay="question.listening" />
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button v-for="choice in choices" :key="choice" type="button" :disabled="selected !== null"
          class="min-h-12 rounded-xl border p-3 font-medium"
          :class="selected !== null && choice === question.correctAnswer ? 'border-green-700 bg-green-100'
            : choice === selected ? 'border-red-700 bg-red-100' : 'border-gray-300 bg-white'"
          @click="answer(choice)">{{ choice }}</button>
      </div>
      <p role="status" class="font-semibold">
        <template v-if="selected !== null">{{ selected === question.correctAnswer ? 'Correct!' : 'Correct answer: ' + question.correctAnswer }}</template>
      </p>
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
