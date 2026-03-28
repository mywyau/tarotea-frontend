<script setup lang="ts">

definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
})

import type { Topic } from '~/types/topic'
import { canAccessTopic, isFreeTopicsJyutpingDojo } from '~/utils/topics/permissions'
import { sortedTopics } from '~/utils/topics/topics'

const {
  isLoggedIn,
  isLoggedOut,
  entitlement,
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

const totalPages = computed(() =>
  Math.ceil(sortedTopics.length / ITEMS_PER_PAGE)
)

const paginatedTopics = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return sortedTopics.slice(start, end)
})

</script>

<template>
  <main class="topics-page max-w-4xl mx-auto py-10 px-2 space-y-10">
    <div class="mb-6">
      <NuxtLink :to="`/dojo`" class="text-black text-sm hover:underline">
        ← Dojo
      </NuxtLink>
    </div>

    <header class="text-center space-y-3 max-w-2xl mx-auto">
      <h1 class="font-semibold topics-heading">
        Topic Dojo
      </h1>
      <p class="topics-subheading">
        Strengthen your phonetic and typing proficiency with our exercises.
      </p>
    </header>

    <div v-if="totalPages > 1" class="pagination-wrapper flex flex-col items-center gap-3 pt-8">
      <div class="pagination-row flex items-center justify-center gap-1.5 sm:gap-3 max-w-full overflow-x-auto">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-arrow"
        >
          ←
        </button>

        <button
          v-for="page in totalPages"
          :key="page"
          @click="goToPage(page)"
          class="pagination-page"
          :class="{ 'is-active': page === currentPage }"
        >
          {{ page }}
        </button>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-arrow"
        >
          →
        </button>
      </div>

      <p class="text-xs text-gray-500">
        Page {{ currentPage }} of {{ totalPages }}
      </p>
    </div>

    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <li
        v-for="quizTopic in paginatedTopics"
        :key="quizTopic.id"
        class="topic-card"
        :class="[
          (!canEnterTopic(quizTopic) || quizTopic.comingSoon) ? 'topic-locked' : ''
        ]"
      >
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

        <div
          v-if="canEnterTopic(quizTopic) && !quizTopic.comingSoon"
          class="grid grid-cols-2 gap-3 pt-4"
        >
          <NuxtLink
            :to="`/dojo/topic/jyutping/training/${quizTopic.id}/v2`"
            class="topic-btn topic-btn-purple"
          >
            Jyutping only
          </NuxtLink>

          <NuxtLink
            :to="`/dojo/topic/chinese/training/${quizTopic.id}/v2`"
            class="topic-btn topic-btn-blue"
          >
            Chinese only
          </NuxtLink>

          <NuxtLink
            :to="`/dojo/topic/sentences/chinese/${quizTopic.id}/v2`"
            class="topic-btn topic-btn-blush col-span-2"
          >
            Sentences Chinese Only
          </NuxtLink>
        </div>

        <p v-else-if="!quizTopic.comingSoon" class="text-xs text-center text-gray-500 pt-4">
          Upgrade to unlock
        </p>
      </li>
    </ul>
  </main>
</template>

<style scoped>

.topics-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

.topics-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.topics-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

/* Card */
.topic-card {
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

.topic-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.topic-locked {
  opacity: 0.6;
}

/* Buttons */
.topic-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 56px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.2;
  transition: all 0.15s ease;
}

.topic-btn-blue {
  background: rgba(168, 202, 224, 0.45);
  color: #1f2937;
}

.topic-btn-blue:hover {
  background: rgba(168, 202, 224, 0.65);
}

.topic-btn-purple {
  background: rgba(214, 163, 209, 0.45);
  color: #1f2937;
}

.topic-btn-purple:hover {
  background: rgba(214, 163, 209, 0.65);
}

.topic-btn-yellow {
  background: rgba(244, 205, 39, 0.45);
  color: #1f2937;
}

.topic-btn-yellow:hover {
  background: rgba(244, 205, 39, 0.65);
}

.topic-btn-blush {
  background: rgb(249, 166, 166);
  color: #1f2937;
}

.topic-btn-blush:hover {
  background: rgb(204, 136, 136);
}

.pagination-wrapper {
  padding: 12px 8px;
  border-radius: 16px;
}

.pagination-row {
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.pagination-row::-webkit-scrollbar {
  display: none;
}

.pagination-page,
.pagination-arrow {
  flex: 0 0 auto;
}

.pagination-page {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8rem;
  background-color: #F6E1E1;
  color: #1f2937;
  transition: all 0.18s ease;
  box-shadow: none;
}

.pagination-page.is-active {
  background-color: #D6A3D1;
  color: #000;
  box-shadow: none;
  transform: translateY(-1px);
}

.pagination-page:hover:not(.is-active) {
  background-color: #EAB8E4;
  transform: translateY(-1px);
}

.pagination-arrow {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  background-color: rgba(244, 205, 39, 0.45);
  color: #1f2937;
  transition: all 0.18s ease;
}

.pagination-arrow:hover:not(:disabled) {
  background-color: rgba(244, 205, 39, 0.65);
  transform: translateY(-1px);
}

.pagination-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (min-width: 640px) {
  .pagination-wrapper {
    padding: 12px 16px;
  }

  .pagination-page {
    min-width: 38px;
    height: 38px;
    border-radius: 12px;
    font-size: 0.9rem;
  }

  .pagination-arrow {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }
}
</style>