<script setup lang="ts">

definePageMeta({
  middleware: ['level-access'],
  ssr: false
})

import { getLevelNumber } from '@/utils/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string | undefined)

const levelNumber = computed(() => {
  if (!slug.value) return null
  return getLevelNumber(slug.value)
})

const {
  authReady,
  isLoggedIn,
  entitlement,
  resolve,
} = useMeStateV2()



watchEffect(() => {
  if (slug.value && levelNumber.value === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found'
    })
  }
})

const features = [
  "XP is awarded when you complete the quiz",
  "Your weakest words will tend to appear more often",
  "Streaks gain you more XP per answer",
  "Randomised questions",
  "Cantonese to English and vice versa"
]

const featureIndex = ref(0)

function nextFeature() {
  featureIndex.value =
    (featureIndex.value + 1) % features.length
}

function prevFeature() {
  featureIndex.value =
    (featureIndex.value - 1 + features.length) % features.length
}

let interval: ReturnType<typeof setInterval> | null = null

function startAutoScroll() {
  stopAutoScroll()
  interval = setInterval(nextFeature, 3500)
}

function stopAutoScroll() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}

onMounted(startAutoScroll)
onBeforeUnmount(stopAutoScroll)

// --- helpers ---

const canEnterLevel = () => {

  if (!authReady.value) return false

  if (levelNumber.value! <= 2) return true

  // Paid levels
  if (!isLoggedIn.value) return false

  return canAccessLevel(entitlement.value!)
}

watch(featureIndex, (newVal) => {
  if (newVal === features.length) {
    // We reached the cloned slide

    setTimeout(() => {
      // Disable animation
      isTransitioning.value = false
      featureIndex.value = 0

      // Re-enable animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isTransitioning.value = true
        })
      })

    }, 500) // MUST match your transition duration
  }
})

</script>


<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <NuxtLink :to="`/quiz/`" class="text-base text-black hover:underline">
      ← All quizzes
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

      <h1 class="text-3xl font-semibold text-gray-900">
        Level {{ levelNumber }}
      </h1>

      <p class="text-black">
        Test your understanding of the words from this level.
      </p>

      <!-- <ul class="features-list text-base text-black">
        <li>XP is awarded when you complete the quiz</li>
        <li>Your weakest words will tend to appear more often</li>
        <li>Streaks gain you more xp per answer</li>
        <li>Randomised questions</li>
        <li>Cantonese ↔ English</li>
      </ul> -->

      <div class="relative max-w-sm mx-auto" @mouseenter="stopAutoScroll" @mouseleave="startAutoScroll">
        <div class="relative h-[120px]">

          <transition name="fade" mode="out-in">
            <div :key="featureIndex" class="absolute inset-0 rounded-xl p-6 bg-[#F6E1E1] flex items-center">
              <p class="text-gray-800 text-left">
                {{ features[featureIndex] }}
              </p>
            </div>
          </transition>

        </div>

        <!-- Controls -->
        <div class="flex justify-center gap-4 mt-4">
          <button @click="prevFeature" class="px-3 py-1 rounded-lg bg-[#EAB8E4] hover:brightness-110">
            ←
          </button>

          <button @click="nextFeature" class="px-3 py-1 rounded-lg bg-[#A8CAE0] hover:brightness-110">
            →
          </button>
        </div>
      </div>

      <NuxtLink :to="`/quiz/${slug}/word/testV3`" class="start-btn">
        Start quiz
      </NuxtLink>

      <div class="pt-6">
        <NuxtLink :to="`/level/${slug}`" class="text-sm text-black hover:underline">
          ← Level {{ levelNumber }} Vocab
        </NuxtLink>
      </div>

    </section>

  </main>
</template>

<style scoped>
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
</style>
