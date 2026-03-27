<script setup lang="ts">

definePageMeta({
  middleware: ['level-access'],
  ssr: false
})

import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'
import { canAccessLevelWord } from '~/utils/levels/permissions'

const route = useRoute()
// const slug = computed(() => route.params.slug as string | undefined)
const slug = route.params.slug as string

// we check the path slug
if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

const canEnterLevel = canAccessLevelWord(levelNumber, entitlement.value!)

const tips = [
  "XP is awarded when you complete the quiz.",
  "Listen to the Cantonese audio and choose the correct English meaning.",
  "Answer streaks increase the XP you earn.",
  "New or weaker words appear more often to help reinforce learning.",
  "Questions are randomized every session.",
  "Each word has a maximum of 500 XP.",
  "Streaks are tracked separately for each word.",
  "Earn at least 5 XP for every correct answer.",  
  "Wrong answers cost 12 XP and reset your streak for that word.",
  "Streaks cap at 5 correct answers in a row for a given word.",
  "Streak XP: 5 → 7 → 9 → 13 → 15."
]

const tipIndex = ref(0)

function nextTip() {
  tipIndex.value = (tipIndex.value + 1) % tips.length
}

onMounted(() => {
  setInterval(nextTip, 5000)
})

watchEffect(() => {
  if (slug && levelNumber === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found'
    })
  }
})

</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <NuxtLink :to="`/quiz/`" class="text-sm text-black hover:underline">
      ← Back
    </NuxtLink>

    <!-- 🔒 Locked -->
    <section v-if="authReady && !canEnterLevel" class="quiz-card text-center space-y-4">

      <h1 class="text-2xl font-semibold text-gray-900">
        Quiz locked
      </h1>

      <p class="text-black">
        This quiz is part of TaroTea Monthly or Yearly.
      </p>

      <p class="text-sm text-gray-500">
        Sign in and upgrade to unlock advanced levels.
      </p>

      <NuxtLink to="/upgrade" class="upgrade-btn mt-4 inline-block">
        Upgrade
      </NuxtLink>
    </section>

    <!-- ✅ Quiz intro -->
    <section v-else class="quiz-card text-center space-y-6">

      <h1 class="text-3xl font-semibold text-black level-heading">
        Level {{ levelNumber }}
      </h1>

      <p class="text-black level-subheading">
        Practice and test your listening skills from this level.
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/quiz/${slug}/audio/v2/test`" class="start-btn">
          Start audio quiz
        </NuxtLink>

        <div class="mt-6">
          <NuxtLink :to="`/level/${slug}`" class="text-sm text-black hover:underline">
            ← Level {{ levelNumber }} Vocab
          </NuxtLink>
        </div>
      </div>

      <div class="mt-2 text-base text-gray-600 max-w-md mx-auto">
        <Transition name="tip-fade" mode="out-in">
          <p :key="tipIndex" class="leading-relaxed text-center">
            {{ tips[tipIndex] }}
          </p>
        </Transition>

        <div class="flex justify-center gap-1 mt-3">
          <span v-for="(_, i) in tips" :key="i" class="w-1.5 h-1.5 rounded-full"
            :class="i === tipIndex ? 'bg-gray-600' : 'bg-gray-300'" />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>

.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.quiz-intro-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

/* Main card */
.quiz-card {
  border-radius: 26px;
  padding: 2rem;
  /* background: #F6E1E1; */
}

/* Feature list */
.features-list {
  text-align: left;
  max-width: 22rem;
  margin: 0 auto;
  color: #374151;
  /* font-size: 0.9rem; */
  line-height: 1.6;
  list-style: none;
  padding: 0;
}

.features-list li {
  padding-left: 1.2rem;
  position: relative;
}

.features-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #D6A3D1;
}

/* Start button */
.start-btn {
  display: block;
  width: 100%;
  border-radius: 16px;
  padding: 0.75rem;
  font-weight: 600;
  text-align: center;
  background: #efb8db;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #eaaad9;
  transform: translateY(-2px);
}

/* Upgrade button */
.upgrade-btn {
  border-radius: 16px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  background: #EAB8E4;
  color: #111827;
  transition: background 0.15s ease;
}

.upgrade-btn:hover {
  background: #d9a6d3;
}

/* Mobile spacing */
@media (max-width: 640px) {
  .quiz-card {
    padding: 1.5rem;
  }
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.tip-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
