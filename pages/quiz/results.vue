<script setup lang="ts">
import type { QuizResult } from '~/composables/useQuizResults'
import { animateCount } from '~/utils/animateCount'

definePageMeta({ alias: '/topic/quiz/results' })
useHead({ title: 'Quiz results · TaroTea' })

const route = useRoute()
const result = shallowRef<QuizResult>()
const ready = ref(false)
const accuracy = ref(0)
const earned = ref(0)
const lost = ref(0)
const finalAccuracy = computed(() => {
  const total = result.value ? result.value.correct + result.value.incorrect : 0
  return result.value && total ? Math.round(100 * result.value.correct / total) : 0
})
const headline = computed(() => {
  const score = finalAccuracy.value
  if (score === 100) return 'Perfect'
  if (score >= 70) return 'Great job'
  if (score >= 50) return 'Nice try'
  return 'Keep practicing'
})
const reviewGroups = computed(() => {
  const r = result.value
  if (!r?.review) return []
  return [
    { title: 'Correct', count: r.correct, words: r.review.correct, color: 'text-green-700' },
    { title: 'Incorrect', count: r.incorrect, words: r.review.incorrect, color: 'text-rose-700' },
  ].filter(group => group.count > 0)
})
onMounted(() => {
  // Each history entry carries its own summary, including on reload and forward navigation.
  const saved = window.history.state?.quizResult
  if (typeof saved === 'string') result.value = JSON.parse(saved)
  ready.value = true
  if (!result.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    accuracy.value = finalAccuracy.value
    earned.value = result.value.xpEarned
    lost.value = result.value.xpLost
  } else {
    animateCount(accuracy, finalAccuracy.value, 800)
    animateCount(earned, result.value.xpEarned, 800)
    animateCount(lost, result.value.xpLost, 800)
  }
})
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 py-8">
    <section v-if="result" class="quiz-completion space-y-6">
      <header class="stat-card hero-card text-center">
        <h1 class="stat-label">{{ result.title }}</h1>
        <p class="hero-title">{{ headline }}</p>
        <p class="hero-score">{{ accuracy }}%</p>
      </header>
      <QuizCompletionFlipStats :correct="result.correct" :incorrect="result.incorrect" :show-score="!result.review"
        :time="result.elapsed" :xp-earned="earned" :xp-lost="lost" />
      <section v-for="group in reviewGroups" :key="group.title" class="stat-card result-word-card">
        <h3>{{ group.title }} <span>{{ group.count }}</span></h3>
        <div class="flex flex-wrap gap-2">
          <NuxtLink v-for="(word, index) in group.words" :key="index" :to="`${result.review?.basePath}/${word.id}`"
            target="_blank" rel="noopener noreferrer" class="rounded-lg" :class="group.color"
            :aria-label="`Open word page for ${word.word} in a new tab`">{{ word.word }}</NuxtLink>
        </div>
      </section>
      <QuizCompletionActions :retry-to="result.retryTo" :back-to="result.backTo" />
    </section>
    <section v-else-if="ready" class="space-y-4 text-center">
      <h1 class="text-2xl font-bold">No quiz results in this tab</h1>
      <AppButton :to="route.path.startsWith('/topic/') ? '/topics/quiz' : '/quiz'">Choose a quiz</AppButton>
    </section>
  </main>
</template>
