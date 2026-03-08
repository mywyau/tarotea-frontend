<script setup lang="ts">

// definePageMeta({
//   middleware: ['coming-soon'],
//   ssr: true,
// })

import type { Topic } from '@/types/topic'
import { sortedTopics } from '@/utils/topics/topics'
import { computed, onMounted, ref } from 'vue'

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  // hasPaidAccess,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

await resolve()

function doNotShowUpgradeMessage(topic: Topic) {

  if (!topic.requiresPaid) return true
  if (!isLoggedIn.value) return false

  const doesNotHaveFreePlan =
    entitlement.value?.plan !== "free" &&
    (
      entitlement.value?.subscription_status === "active" ||
      entitlement.value?.subscription_status === "trialing" ||
      entitlement.value?.subscription_status === "past_due"
    )

  return doesNotHaveFreePlan
}

function topicLink(topic: Topic) {
  if (topic.comingSoon) return "/coming-soon"

  if (!topic.requiresPaid) {
    return `/topic/words/${topic.id}`
  }
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

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

// watch(sortedTopics, () => {
//   currentPage.value = 1
// })

</script>


<template>
  <main class="topics-page max-w-5xl mx-auto py-12 px-4 space-y-4">

    <NuxtLink :to="`/`" class="inline-block text-sm text-black hover:underline">
      ← Home
    </NuxtLink>

    <header class="rounded-lg header-card">
      <h1 class="text-2xl font-semibold text-gray-900">Topics</h1>
      <p class="text-gray-700 text-sm mt-2 ">
        Vocabulary and sentences grouped by subject matter.
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

    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">

      <li v-for="topic in paginatedTopics" :key="topic.id" class="topic-card rounded-lg p-4 space-y-3 transition"
        :class="[
          topic.comingSoon
            // || (topic.requiresPaid && !canEnterTopic(topic))
            ? 'is-disabled'
            : 'is-active'
        ]">

        <NuxtLink :to="topicLink(topic)" class="block space-y-3">
          <!-- Title row -->
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 leading-snug">
                {{ topic.title }}
              </h2>

              <p v-if="topic.comingSoon" class="mt-2">
                <span class="pill text-black">Coming soon</span>
              </p>

              <p v-else-if="topic.requiresPaid && !doNotShowUpgradeMessage(topic)" class="mt-2">
                <span class="pill pill-locked">Locked</span>
              </p>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-gray-700">
            {{ topic.description }}
          </p>
        </NuxtLink>
      </li>
    </ul>

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

  </main>

  <!-- <div v-else class="py-20 text-center text-gray-500">
    Loading topics...
  </div> -->
</template>

<style scoped>
/* Palette variables */
.topics-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  /* assuming this is what you meant */
  --yellow: #F4CD27;
  --blush: #F6E1E1;
  border-radius: 16px;
}

/* Header card */
.header-card {
  backdrop-filter: blur(6px);
}

/* Topic cards */
.topic-card {
  background: rgba(165, 213, 245, 0.441);
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}

.topic-card.is-active:hover {
  transform: translateY(-1px);
  background: rgba(215, 239, 255, 0.893);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.topic-card.is-disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: rgba(246, 225, 225, 0.35);
}

/* Pills (badges) */
.pill {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Coming soon = blue tint */
.pill-soon {
  color: rgba(0, 0, 0, 0.75);
}

/* Locked = yellow tint (use sparingly) */
.pill-locked {
  background: rgba(244, 205, 39, 0.60);
  color: rgba(0, 0, 0, 0.80);
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

<!-- 
--brown: #8B5E3C;           /* brown sugar */
--brown-soft: #C69C6D;      /* milk tea */
--cream: #F5E6D3;           /* milk foam */
--caramel: #B87333;         /* caramel accent */ 
-->