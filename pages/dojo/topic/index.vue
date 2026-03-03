<script setup lang="ts">

definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
})

import type { Topic } from '~/types/topic'
import { topicJyutpingQuizMeta } from '~/utils/topics/helpers'
import { canAccessTopic, isFreeTopicsJyutpingDojo } from '~/utils/topics/permissions'

const {
  state,
  authReady,
  isLoading,
  isLoggedIn,
  isLoggedOut,
  user,
  entitlement,
  hasPaidAccess,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

const isComingSoon = (topic: Topic) => topic.comingSoon === true

const canEnterTopic = (topic: Topic) => {

  if (isLoggedOut.value) return false

  if (isComingSoon(topic)) return false

  if (isFreeTopicsJyutpingDojo(topic.id)) return true

  // 🔒 Paid topics require login
  if (!isLoggedIn.value) return false

  return canAccessTopic(isLoggedIn.value, entitlement.value, topic.id)
}

const ITEMS_PER_PAGE = 12
const currentPage = ref(1)

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const sortedTopics = computed(() =>
  [...topicJyutpingQuizMeta].sort((a, b) => {
    // Coming soon topics go to the end
    if (a.comingSoon !== b.comingSoon) {
      return a.comingSoon ? 1 : -1
    }

    // Optional: push paid topics after free ones
    if (!!a.requiresPaid !== !!b.requiresPaid) {
      return a.requiresPaid ? 1 : -1
    }

    return 0
  })
)

const totalPages = computed(() =>
  Math.ceil(sortedTopics.value.length / ITEMS_PER_PAGE)
)

const paginatedTopics = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return sortedTopics.value.slice(start, end)
})

</script>

<template>
  <main class="topics-page max-w-5xl mx-auto py-10 px-4 space-y-8">

    <div class="mb-6">
      <NuxtLink :to="`/dojo`" class="text-black text-sm hover:underline">
        ← Dojo
      </NuxtLink>
    </div>

    <!-- Header -->
    <header class="text-center space-y-3 max-w-2xl mx-auto">
      <h1 class="text-3xl font-semibold text-gray-900">
        Topic Dojo
      </h1>
      <p class="text-gray-600 text-sm sm:text-base">
        Strenghten your phonetic proficiency with our exercises
      </p>
    </header>

    <div v-if="totalPages > 1" class="pagination-wrapper flex justify-center items-center gap-3 pt-8">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">
        ←
      </button>

      <button v-for="page in totalPages" :key="page" @click="goToPage(page)" class="pagination-page"
        :class="{ 'is-active': page === currentPage }">
        {{ page }}
      </button>

      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow">
        →
      </button>
    </div>

    <!-- Grid -->
    <ul class="grid grid-cols-1 sm:grid-cols-3 gap-6">

      <li v-for="quizTopic in paginatedTopics" :key="quizTopic.id" class="
          rounded-2xl
          p-6
          bg-white/75
          backdrop-blur-md
          shadow-md
          transition-all
          duration-150
          flex
          flex-col
          justify-between
          hover:-translate-y-1
          hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]
        " :class="[
          (!canEnterTopic(quizTopic) || quizTopic.comingSoon)
            ? 'opacity-60'
            : ''
        ]">

        <!-- Title -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ quizTopic.title }}
          </h2>

          <p class="text-sm text-gray-600 leading-relaxed">
            {{ quizTopic.description }}
          </p>

          <p v-if="quizTopic.comingSoon" class="text-xs text-gray-400 font-medium">
            Coming soon
          </p>
        </div>

        <!-- Buttons -->
        <div v-if="canEnterTopic(quizTopic) && !quizTopic.comingSoon" class="grid grid-cols-2 gap-3 pt-4">
          <NuxtLink :to="`/dojo/topic/jyutping/training/${quizTopic.id}`"
            class="rounded-lg text-black text-sm px-2 py-2 font-medium text-center hover:brightness-110"
            style="background-color:#EAB8E4;">
            Start
          </NuxtLink>

          <NuxtLink :to="`/coming-soon`"
            class="rounded-lg text-black text-sm px-2 py-2 font-medium text-center hover:brightness-110"
            style="background-color:#EAB8E4;">
            Chinese only
          </NuxtLink>
        </div>

        <!-- Locked -->
        <p v-else-if="!quizTopic.comingSoon" class="text-xs text-center text-gray-500 pt-4">
          Upgrade to unlock
        </p>

      </li>

    </ul>

  </main>
</template>

<style>
:root {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #ffec95;
  --blush: #F6E1E1;
}

/* Card */
.Topic-card {
  border-radius: 20px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.Topic-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.Topic-locked {
  opacity: 0.6;
}

/* Buttons */
.Topic-btn {
  text-align: center;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.15s ease;
}

/* Colour variations */
.Topic-btn-yellow {
  background: var(--yellow);
  color: #1f2937;
}


/* Pink + Yellow TaroTea pagination */

.pagination-wrapper {
  padding: 12px 16px;
  border-radius: 16px;
}

/* Page numbers */
.pagination-page {
  min-width: 38px;
  height: 38px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;

  background-color: #F6E1E1;
  /* blush */
  color: #3A2A2A;

  transition: all 0.18s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.pagination-page:hover {
  background-color: #EAB8E4;
  /* pink */
  transform: translateY(-1px);
}

/* Active page */
.pagination-page.is-active {
  background-color: #D6A3D1;
  /* stronger pink/purple */
  color: #000;
  box-shadow: 0 6px 16px rgba(214, 163, 209, 0.35);
  transform: translateY(-1px);
}

/* Arrows */
.pagination-arrow {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-weight: 600;

  background-color: rgba(244, 205, 39, 0.35);
  /* soft yellow */
  color: #3A2A2A;

  transition: all 0.18s ease;
}

.pagination-arrow:hover:not(:disabled) {
  background-color: rgba(244, 205, 39, 0.55);
  transform: translateY(-1px);
}

.pagination-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
