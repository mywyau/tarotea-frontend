<script setup lang="ts">
useSeoMeta({
  title: 'Learn Cantonese in 15 minutes a day',
  description: 'Learn natural Cantonese with vocabulary, sentence quizzes, audio-only drills, and writing practice.',
  ogTitle: 'Learn Cantonese in 15 minutes a day | TaroTea',
  ogDescription: 'Build everyday Cantonese with short, focused practice sessions.',
})

import {
  CalendarCheck,
  GraduationCap,
  Layers,
  PenLine,
  Tags,
  TrendingUp,
  UsersRound,
  Sword,
} from '@lucide/vue'

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

type HeadingLetter = {
  letter: string
  gradient: boolean
  index: number
}

type HeadingWord = {
  letters: HeadingLetter[]
  trailingSpace: boolean
}

const headingSegments = [
  { text: 'Learn and improve your Cantonese in just ', gradient: false },
  { text: '15 minutes', gradient: true },
  { text: ' a day', gradient: false },
]

const headingLetters = headingSegments.flatMap((segment) =>
  Array.from(segment.text).map((letter) => ({
    letter,
    gradient: segment.gradient,
  })),
)

const headingWords = headingLetters.reduce<HeadingWord[]>((words, item, index) => {
  if (item.letter === ' ') {
    const currentWord = words.at(-1)

    if (currentWord) {
      currentWord.trailingSpace = true
    }

    return words
  }

  if (index === 0 || headingLetters[index - 1]?.letter === ' ') {
    words.push({ letters: [], trailingSpace: false })
  }

  words.at(-1)?.letters.push({
    letter: item.letter,
    gradient: item.gradient,
    index,
  })

  return words
}, [])

const headingText = headingSegments.map((segment) => segment.text).join('')

const learningModes = [
  {
    title: 'Daily practice',
    description: 'Short sessions designed for consistency, even with a busy schedule. Run a short quiz whenever you want',
    bgClass: 'brand-card-yellow',
    icon: CalendarCheck,
  },
  {
    title: 'Multiple activities',
    description: 'Switch between multiple quiz types, practice pronunciation and typing skills with various activities.',
    bgClass: 'brand-card-blue',
    icon: Layers,
  },
  {
    title: 'Progress-driven',
    description: 'See your growth and keep momentum with clear goals and repetition. Track progress via XP and unlock more words for free. Visualise which words are familiar and words that you may need to work on easily.',
    bgClass: 'brand-card-pink',
    icon: TrendingUp,
  },
  {
    title: 'Learn how to write',
    description: 'Grab your pen and paper! Watch and learn how to write traditional chinese characters by following the Hanzi Writer strokes.',
    bgClass: 'brand-card-green',
    icon: PenLine,
  },
]

const currentUsers = ref<number | null>(null)
const isStartPanelFlipped = ref(false)

function flipStartPanel() {
  isStartPanelFlipped.value = !isStartPanelFlipped.value
}
const sessionCookie = useCookie<string>('online_session_id', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

async function refreshCurrentUsers() {
  if (!sessionCookie.value && import.meta.client) {
    sessionCookie.value = crypto.randomUUID()
  }

  const data = await $fetch<{ currentUsers: number }>('/api/current-users', {
    method: 'POST',
    body: {
      sessionId: sessionCookie.value,
    },
  })

  currentUsers.value = data.currentUsers
}

onMounted(() => {
  void refreshCurrentUsers()
  const interval = setInterval(() => {
    void refreshCurrentUsers()
  }, 30_000)

  onBeforeUnmount(() => {
    clearInterval(interval)
  })
})
</script>

<template>
  <main class="relative max-w-4xl mx-auto py-16 sm:py-20 px-6 min-h-screen">

    <section class="text-center">

      <h1 class="heading-fly-in text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900"
        :aria-label="headingText">
        <span v-for="(word, wordIndex) in headingWords" :key="`heading-word-${wordIndex}`" aria-hidden="true"
          class="heading-fly-in-word">
          <span v-for="item in word.letters" :key="`${item.letter}-${item.index}`" class="heading-fly-in-letter"
            :class="{ 'brand-text-gradient': item.gradient }" :style="{ animationDelay: `${item.index * 32}ms` }">{{
              item.letter }}</span><span v-if="word.trailingSpace">&nbsp;</span>
        </span>
      </h1>

      <div class="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto">
        <div class="relative rounded-xl p-5 text-center brand-card-green ">
          <div class="inline-flex items-center justify-center gap-2 text-2xl font-semibold text-gray-900">
            <span>{{ currentUsers ?? '—' }}</span>
            <UsersRound class="size-[1em]" :stroke-width="2.2" />
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Current users online
          </div>
        </div>

        <div class="relative rounded-xl p-5 text-center brand-card-pink">
          <div class="inline-flex items-center justify-center gap-2 text-2xl font-semibold text-gray-900">
            <span>{{ stats?.totalUsers ?? '—' }}</span>
            <GraduationCap class="size-[1em]" :stroke-width="2.2" />
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>
      </div>

      <p class="text-base sm:text-lg text-gray-800 mt-10 max-w-2xl mx-auto">
        Build confidence with quick, focused and fun activities that help you remember what you learn.
        Practice at you own pace, no daily streaks or annoying birds. Grind whatever, whenever you want.
      </p>
    </section>

    <section class="mt-10 sm:mt-12 start-learning-flip hover:brightness-105"
      aria-label="Start learning Cantonese today">
      <div class="start-learning-scene" :class="{ 'is-flipped': isStartPanelFlipped }" @click="flipStartPanel">
        <article
          class="start-learning-face start-learning-face-front rounded-2xl p-5 sm:p-8 brand-cta-topic-bg text-gray-900 shadow-sm">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-xl sm:mt-2 sm:text-2xl font-semibold tracking-tight">
                Start learning Cantonese today
              </h2>
              <p class="start-learning-copy text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
                Explore themed word collections, then reinforce what you discover with topic quizzes built around
                everyday conversations.
              </p>
            </div>
          </div>

          <div class="start-learning-actions mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <NuxtLink to="/topics"
              class="inline-flex min-h-11 items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 sm:min-h-0 sm:px-4 sm:text-base"
              @click.stop>
              Explore Topics
            </NuxtLink>
            <NuxtLink to="/topics/quiz"
              class="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-700 px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/60 sm:min-h-0 sm:px-4 sm:text-base"
              @click.stop>
              Topic quizzes
            </NuxtLink>
          </div>

          <NuxtLink to="/dojo/topic" class="start-learning-dojo-link start-learning-dojo-link-topic"
            aria-label="Enter Topic Dojo" @click.stop>
            <span class="start-learning-dojo-burst" aria-hidden="true"></span>
            <Sword class="start-learning-dojo-icon" aria-hidden="true" />
            <span class="sr-only">Enter Topic Dojo</span>
          </NuxtLink>
        </article>

        <article
          class="start-learning-face start-learning-face-back rounded-2xl p-5 sm:p-8 brand-cta-level-bg text-gray-900 shadow-sm">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-xl sm:mt-2 sm:text-2xl font-semibold tracking-tight">
                Start learning Cantonese today
              </h2>
              <p class="start-learning-copy text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
                Work through content in structured levels at your own pace, then practice and train with activities that
                build
                confidence step by step.
              </p>
            </div>
          </div>

          <div class="start-learning-actions mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <NuxtLink to="/levels"
              class="inline-flex min-h-11 items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 sm:min-h-0 sm:px-4 sm:text-base"
              @click.stop>
              Explore Levels
            </NuxtLink>
            <NuxtLink to="/quiz"
              class="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-700 px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/60 sm:min-h-0 sm:px-4 sm:text-base"
              @click.stop>
              Level quizzes
            </NuxtLink>
          </div>

          <NuxtLink to="/dojo/level" class="start-learning-dojo-link start-learning-dojo-link-level"
            aria-label="Enter Level Dojo" @click.stop>
            <span class="start-learning-dojo-burst" aria-hidden="true"></span>
            <Sword class="start-learning-dojo-icon" aria-hidden="true" />
            <span class="sr-only">Enter Level Dojo</span>
          </NuxtLink>
        </article>
      </div>
    </section>

    <section class="mt-14">
      <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
        How you learn
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <article v-for="mode in learningModes" :key="mode.title" :class="mode.bgClass"
          class="relative rounded-xl p-5 pr-16">
          <div class="absolute right-4 top-4 inline-flex size-9 items-center justify-center text-gray-900">
            <component :is="mode.icon" class="size-5" :stroke-width="2.2" />
          </div>

          <h3 class="font-semibold text-gray-900">
            {{ mode.title }}
          </h3>

          <p class="text-sm text-gray-800 mt-2">
            {{ mode.description }}
          </p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.brand-card-green {
  background-color: #E7F3D5;
}

.brand-card-pink {
  background-color: #F6E1E1;
}

.brand-card-lilac {
  background-color: #EAB8E4;
}

.brand-card-blue {
  background-color: #A8CAE0;
}

.brand-card-yellow {
  background-color: rgba(244, 205, 39, 0.35);
}

.brand-cta-bg,
.brand-cta-level-bg {
  background: linear-gradient(135deg, #F6E1E1 0%, #EAB8E4 50%, #A8CAE0 100%);
}

.brand-cta-topic-bg {
  background: linear-gradient(135deg, #E7F3D5 0%, #C8E9E1 48%, #A8CAE0 100%);
}

.start-learning-flip {
  perspective: 1200px;
}

.start-learning-scene {
  position: relative;
  min-height: clamp(15.75rem, 30vw, 18rem);
  cursor: pointer;
  outline: none;
  outline: none;
  transform-style: preserve-3d;
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.start-learning-scene.is-flipped {
  transform: rotateY(180deg);
}

.start-learning-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: clamp(15.75rem, 30vw, 18rem);
  overflow: visible;
  padding-bottom: 5rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  transition: box-shadow 220ms ease, filter 220ms ease;
}

.start-learning-face::before {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.72), transparent 34%), rgba(255, 255, 255, 0.12);
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
}

.start-learning-face>* {
  position: relative;
  z-index: 1;
}

/* .start-learning-scene:hover .start-learning-face {
  box-shadow: 0 24px 60px rgba(94, 166, 214, 0.34), 0 0 0 1px rgba(255, 255, 255, 0.72) inset;
  filter: saturate(1.10) brightness(1.04);
} */

/* .start-learning-scene:hover .start-learning-face::before {
  opacity: 1;
} */

.start-learning-face-back {
  pointer-events: none;
  transform: rotateY(180deg);
}

.start-learning-scene.is-flipped .start-learning-face-front {
  pointer-events: none;
}

.start-learning-scene.is-flipped .start-learning-face-back {
  pointer-events: auto;
}

.start-learning-face :is(a, button) {
  transform: translateZ(1px);
}

.start-learning-dojo-link {
  position: absolute;
  bottom: 1.1rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.4rem;
  height: 3.4rem;
  color: rgba(17, 24, 39, 0.92);
  background: rgba(255, 255, 255, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 999px;
  box-shadow: 0 16px 36px rgba(17, 24, 39, 0.12);
  isolation: isolate;
  transition: background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.start-learning-dojo-link-topic {
  right: 1.1rem;
}

.start-learning-dojo-link-level {
  left: 1.1rem;
}

.start-learning-dojo-link:hover,
.start-learning-dojo-link:focus-visible {
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 20px 42px rgba(17, 24, 39, 0.16);
  transform: translateY(-0.1rem) scale(1.08);
}

.start-learning-dojo-link:focus-visible {
  outline: 3px solid rgba(240, 121, 202, 0.55);
  outline-offset: 3px;
}

.start-learning-dojo-icon {
  width: 2rem;
  height: 2rem;
  stroke-width: 2.35;
  transition: transform 180ms ease;
}

.start-learning-dojo-link:hover .start-learning-dojo-icon,
.start-learning-dojo-link:focus-visible .start-learning-dojo-icon {
  transform: translateY(-0.08rem) rotate(-8deg);
}

.start-learning-dojo-link-level .start-learning-dojo-icon {
  transform: scaleX(-1);
}

.start-learning-dojo-link-level:hover .start-learning-dojo-icon,
.start-learning-dojo-link-level:focus-visible .start-learning-dojo-icon {
  transform: scaleX(-1) translateY(-0.08rem) rotate(-8deg);
}

.start-learning-dojo-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: -1;
  width: 0.24rem;
  height: 0.24rem;
  background: transparent;
  border-radius: 999px;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
  pointer-events: none;
  box-shadow:
    -0.18rem -1.18rem 0 -0.03rem rgba(159, 91, 181, 0.95),
    0.54rem -1rem 0 -0.08rem rgba(133, 78, 161, 0.9),
    1.15rem -0.28rem 0 -0.05rem rgba(181, 123, 195, 0.92),
    1.02rem 0.76rem 0 -0.08rem rgba(115, 65, 150, 0.86),
    0.18rem 1.18rem 0 -0.04rem rgba(159, 91, 181, 0.92),
    -0.62rem 0.92rem 0 -0.08rem rgba(181, 123, 195, 0.9),
    -1.16rem 0.34rem 0 -0.05rem rgba(133, 78, 161, 0.9),
    -0.9rem -0.68rem 0 -0.1rem rgba(159, 91, 181, 0.86);
}

.start-learning-dojo-link:hover .start-learning-dojo-burst,
.start-learning-dojo-link:focus-visible .start-learning-dojo-burst {
  animation: lilacBurst 650ms ease-out both;
}

@media (min-width: 640px) {
  .start-learning-face {
    padding-bottom: 2rem;
  }

  .start-learning-dojo-link {
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
  }

  .start-learning-dojo-link-topic {
    right: -1.75rem;
  }

  .start-learning-dojo-link-level {
    left: -1.75rem;
  }

  .start-learning-dojo-link:hover,
  .start-learning-dojo-link:focus-visible {
    transform: translateY(-50%) scale(1.08);
  }
}

.start-learning-copy {
  text-wrap: pretty;
}

.heading-fly-in {
  text-wrap: balance;
}

.heading-fly-in-letter {
  display: inline-block;
  opacity: 0;
  transform: translate3d(var(--letter-start-x, 0), var(--letter-start-y, 0), 0) rotate(var(--letter-start-rotate, 0deg)) scale(0.72);
  animation: heading-letter-fly-in 720ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  will-change: transform, opacity;
}

.heading-fly-in-letter:nth-child(4n + 1) {
  --letter-start-x: -1.8rem;
  --letter-start-y: -2.1rem;
  --letter-start-rotate: -18deg;
}

.heading-fly-in-letter:nth-child(4n + 2) {
  --letter-start-x: 1.6rem;
  --letter-start-y: -1.5rem;
  --letter-start-rotate: 16deg;
}

.heading-fly-in-letter:nth-child(4n + 3) {
  --letter-start-x: -1.2rem;
  --letter-start-y: 2rem;
  --letter-start-rotate: 12deg;
}

.heading-fly-in-letter:nth-child(4n) {
  --letter-start-x: 1.8rem;
  --letter-start-y: 1.4rem;
  --letter-start-rotate: -14deg;
}

.heading-fly-in-word {
  display: inline-block;
  white-space: nowrap;
}

@keyframes heading-letter-fly-in {
  0% {
    opacity: 0;
    transform: translate3d(var(--letter-start-x, 0), var(--letter-start-y, 0), 0) rotate(var(--letter-start-rotate, 0deg)) scale(0.72);
  }

  70% {
    opacity: 1;
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}

@keyframes lilacBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }

  35% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45);
  }
}

@media (max-width: 640px) {
  .start-learning-scene,
  .start-learning-face {
    min-height: 16.5rem;
  }

  .start-learning-face {
    justify-content: center;
  }
}

@media (max-width: 360px) {

  .start-learning-scene,
  .start-learning-face {
    min-height: 18.5rem;
  }

  .start-learning-actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .start-learning-scene {
    transition-duration: 1ms;
  }

  .heading-fly-in-letter {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .start-learning-dojo-burst {
    animation: none;
  }
}

.brand-text-gradient {
  background: linear-gradient(90deg, #f079ca 50%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* .brand-text-gradient {
  background: linear-gradient(
      90deg,
      #8972ff 0%,
      #7795f9 50%,
      #f977d0 100%,
    );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
} */
</style>
