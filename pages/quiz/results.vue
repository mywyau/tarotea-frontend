<script setup lang="ts">
import type { QuizResult } from '~/composables/useQuizResults'
import { animateCount } from '~/utils/animateCount'

definePageMeta({ alias: '/topic/quiz/results' })
useHead({ title: 'Quiz results · TaroTea' })

const route = useRoute()
const router = useRouter()
const result = shallowRef<QuizResult>()
const practising = ref(false)
const practiceButton = ref<{ $el: HTMLButtonElement } | null>(null)
async function closePractice() {
  practising.value = false
  await nextTick()
  practiceButton.value?.$el.focus()
}
const saving = ref(false)
const saveError = ref('')
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

async function saveWordQuiz() {
  const summary = result.value
  if (!summary?.pendingSave || saving.value) return
  const { userId, ...attempt } = summary.pendingSave
  saving.value = true
  saveError.value = ''
  try {
    const auth = await useAuth()
    if (auth.user?.sub !== userId) {
      saveError.value = 'Sign in with the account you used for this quiz to save your XP.'
      return
    }
    const token = await auth.getAccessToken()
    if (!token) {
      saveError.value = 'Sign in again to save your XP.'
      return
    }
    await $fetch('/api/quiz/grind/finalize-v5', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: attempt,
      timeout: 15000,
    })
    const completed = { ...summary }
    delete completed.pendingSave
    result.value = completed
    // A learner can leave this page while the request is in flight.
    const history = router.options.history
    if (history.state.quizResult === JSON.stringify(summary)) {
      history.replace(history.location, { quizResult: JSON.stringify(completed) })
    }
  } catch {
    saveError.value = 'We couldn’t confirm your XP was saved. You can retry here.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  // Each history entry carries its own summary, including on reload and forward navigation.
  const saved = window.history.state?.quizResult
  if (typeof saved === 'string') result.value = JSON.parse(saved)
  ready.value = true
  if (!result.value) return
  void saveWordQuiz()
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
    <MissedWordPractice v-if="practising && result?.missedQuestions?.length"
      :questions="result.missedQuestions" @close="closePractice" />
    <section v-else-if="result" class="quiz-completion space-y-6">
      <header class="space-y-2 py-2 text-center">
        <h1 class="text-sm font-semibold">{{ result.title }}</h1>
        <p class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ headline }}</p>
        <p class="text-5xl font-bold tracking-tight sm:text-6xl">{{ accuracy }}%</p>
      </header>
      <QuizCompletionFlipStats :correct="result.correct" :incorrect="result.incorrect" :show-score="!result.review"
        :time="result.elapsed" :xp-earned="earned" :xp-lost="lost" :show-xp="!result.pendingSave" />
      <div v-if="result.pendingSave" class="space-y-2" aria-live="polite">
        <p>{{ saveError || 'Saving your XP…' }}</p>
        <AppButton v-if="saveError" @click="saveWordQuiz">Retry saving XP</AppButton>
      </div>
      <AppButton v-if="result.missedQuestions?.length" ref="practiceButton" @click="practising = true">
        Practise the words I missed
      </AppButton>
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
