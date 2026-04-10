<script setup lang="ts">

definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false
})

import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = route.params.slug as string

// we check the path slug
if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const {
  authReady,
  isLoggedIn,
} = useMeStateV2()


watchEffect(() => {
  if (slug && levelNumber === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found'
    })
  }
})

const features = [
  "XP is awarded when you complete a quiz.",
  "Each word has a maximum of 500 XP.",
  "Streaks are tracked separately for each word.",
  "New and weaker words appear more frequently.",
  "Earn at least 5 XP for every correct answer.",
  "Answer streaks increase the XP you earn.",
  "Questions are randomized every session.",
  "Practice Cantonese → English + English → Cantonese.",
  "Audio is disabled to focus on reading comprehension.",
  "Wrong answers cost 12 XP and reset your streak for that word.",
  "Streaks cap at 5 correct answers in a row for a given word.",
  "Streak XP: 5 → 7 → 9 → 13 → 15."
]

const featureIndex = ref(0)

function nextFeature() {
  featureIndex.value =
    (featureIndex.value + 1) % features.length
}

onMounted(() => {
  setInterval(nextFeature, 5000)
})

// --- helpers ---

// const canEnterLevel = () => {

//   if (!isLoggedIn.value) return false

//   if (levelNumber! <= 3) return true

//   if (!isLoggedIn.value) return false

//   return canAccessLevel(isLoggedIn.value, entitlement.value)
// }

const canEnterLevel = () => {
  if (isLoggedIn.value) { return true } else { return false }
}

</script>


<template>

  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <NuxtLink :to="`/quiz/`" class="text-sm text-black hover:underline">
      ← Back
    </NuxtLink>

    <!-- 🔒 Locked -->
    <section v-if="authReady && !canEnterLevel()" class="quiz-card text-center space-y-4">

      <h1 class="text-2xl font-semibold text-gray-900">
        Quiz locked
      </h1>

      <p class="text-black">
        This quiz is part of TaroTea Monthly or Yearly.
      </p>

      <p class="text-sm text-black">
        Sign in and upgrade to unlock advanced levels.
      </p>

      <NuxtLink to="/upgrade" class="upgrade-btn mt-4 inline-block">
        Upgrade
      </NuxtLink>
    </section>

    <!-- ✅ Quiz intro -->
    <section v-else class="quiz-card text-center space-y-6">

      <h1 class="text-3xl font-semibold text-gray-900 level-heading">
        Level {{ levelNumber }}
      </h1>

      <p class="text-black level-subheading">
        Practice and test your understanding of the words from this level.
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/quiz/${slug}/word/v2/test`" class="start-btn">
          Start vocabulary quiz
        </NuxtLink>

        <div class="mt-6">
          <NuxtLink :to="`/level/${slug}`" class="text-sm text-black hover:underline">
            ← Level {{ levelNumber }} Vocab
          </NuxtLink>
        </div>
      </div>

      <div class="text-base text-gray-500 p-4 max-w-md mx-auto">

        <div class="flex items-center justify-between gap-3">

          <Transition name="tip-fade" mode="out-in">
            <p :key="featureIndex" class="text-center flex-1 leading-relaxed">
              {{ features[featureIndex] }}
            </p>
          </Transition>

        </div>

        <div class="flex justify-center gap-1 mt-3">
          <span v-for="(_, i) in features" :key="i" class="w-1.5 h-1.5 rounded-full"
            :class="i === featureIndex ? 'bg-gray-600' : 'bg-gray-300'" />
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  background: #A8CAE0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
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
