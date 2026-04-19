<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { TopicQuiz } from '~/types/topic'
import { sortedTopics } from '~/utils/topics/topics'

const { isLoggedIn, resolve } = useMeStateV2()

const ITEMS_PER_PAGE = 8
const currentPage = ref(1)
const MAX_VISIBLE_PAGES = 4

const totalPages = computed(() => Math.ceil(sortedTopics.length / ITEMS_PER_PAGE))

const paginatedTopics = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return sortedTopics.slice(start, start + ITEMS_PER_PAGE)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  let start = current
  let end = current + MAX_VISIBLE_PAGES - 1

  if (end > total) {
    end = total
    start = total - MAX_VISIBLE_PAGES + 1
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const showFirstButton = computed(() => visiblePages.value.length > 0 && visiblePages.value[0] > 1)
const showLastButton = computed(() => visiblePages.value.length > 0 && visiblePages.value.at(-1)! < totalPages.value)

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function canEnterTopic(topic: TopicQuiz): boolean {
  if (topic.comingSoon) return false
  return isLoggedIn.value
}

const topicModes = [
  { id: 'word', label: 'Vocab', hint: 'Meaning recall', className: 'tone-blue' },
  { id: 'audio', label: 'Audio', hint: 'Listening', className: 'tone-purple' },
  { id: 'sentence', label: 'Sentence', hint: 'Context meaning', className: 'tone-yellow' },
  { id: 'sentence-audio', label: 'Sentence Audio', hint: 'Audio + context', className: 'tone-blush' },
]

function routeFor(topicId: string, modeId: string) {
  if (modeId === 'word') return `/topic/quiz/vocabulary/word/v5/${topicId}`
  if (modeId === 'audio') return `/topic/quiz/vocabulary/audio/v5/${topicId}/start-quiz`
  if (modeId === 'sentence') return `/topic/quiz/sentences/no-audio/${topicId}/v3/start-quiz`
  return `/topic/quiz/sentences/audio/${topicId}/v3/start-quiz`
}

watch(sortedTopics, () => {
  currentPage.value = 1
})

onMounted(async () => {
  await resolve()
})
</script>

<template>
  <main class="quiz-selector max-w-5xl mx-auto py-10 px-4 space-y-8">
    <BackLink />

    <header class="space-y-3">
      <h1 class="page-title">Choose a topic quiz type</h1>
      <p class="page-subtitle">
        Pick a topic and decide your mode: vocab, audio, sentence, or sentence-audio.
      </p>

      <div class="mode-chips">
        <span v-for="mode in topicModes" :key="mode.id" class="chip" :class="mode.className">
          {{ mode.label }} · {{ mode.hint }}
        </span>
      </div>
    </header>

    <ul class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <li
        v-for="topic in paginatedTopics"
        :key="topic.id"
        class="topic-card"
        :class="topic.comingSoon || !canEnterTopic(topic) ? 'is-locked' : ''"
      >
        <div>
          <div class="card-top">
            <h2 class="card-title">{{ topic.title }}</h2>
            <span v-if="topic.comingSoon" class="pill">Coming soon</span>
          </div>

          <p class="card-description">{{ topic.description }}</p>
        </div>

        <div v-if="canEnterTopic(topic)" class="mode-grid">
          <NuxtLink
            v-for="mode in topicModes"
            :key="mode.id"
            :to="routeFor(topic.id, mode.id)"
            class="mode-btn"
            :class="mode.className"
          >
            <span class="mode-label">{{ mode.label }}</span>
            <span class="mode-hint">{{ mode.hint }}</span>
          </NuxtLink>
        </div>

        <p v-else class="locked-copy">Sign in to unlock this topic quiz.</p>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="pagination-wrapper">
      <div class="pagination-row">
        <button v-if="showFirstButton" @click="goToPage(1)" :disabled="currentPage === 1" class="pagination-jump">«</button>
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">←</button>

        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="pagination-page"
          :class="{ 'is-active': page === currentPage }"
        >
          {{ page }}
        </button>

        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow">→</button>
        <button v-if="showLastButton" @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="pagination-jump">»</button>
      </div>

      <p class="pagination-meta">Page {{ currentPage }} of {{ totalPages }}</p>
    </div>
  </main>
</template>

<style scoped>
.page-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.74);
  max-width: 52rem;
}

.mode-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem; }

.chip {
  font-size: 0.74rem;
  border-radius: 999px;
  padding: 0.33rem 0.68rem;
  font-weight: 600;
  color: #1f2937;
}

.topic-card {
  border-radius: 20px;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(17, 24, 39, 0.07);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.topic-card.is-locked { opacity: 0.65; }

.card-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.card-title { font-size: 1.05rem; font-weight: 700; color: #111827; }

.pill {
  font-size: 0.69rem;
  border-radius: 999px;
  background: #F6E1E1;
  color: #374151;
  padding: 0.22rem 0.58rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.card-description { margin-top: 0.4rem; font-size: 0.88rem; color: rgba(17, 24, 39, 0.76); }

.mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }

.mode-btn {
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  transition: transform 0.14s ease, filter 0.14s ease;
}

.mode-btn:hover { transform: translateY(-1px); filter: brightness(1.04); }

.mode-label { font-size: 0.84rem; font-weight: 700; color: #1f2937; }
.mode-hint { font-size: 0.74rem; color: rgba(17, 24, 39, 0.72); }
.locked-copy { font-size: 0.78rem; color: rgba(17, 24, 39, 0.72); }

.pagination-wrapper { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding-top: 0.75rem; }
.pagination-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }

.pagination-page,
.pagination-arrow,
.pagination-jump {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8rem;
  background-color: #F6E1E1;
  color: #1f2937;
}

.pagination-page.is-active { background-color: #D6A3D1; }
.pagination-meta { font-size: 0.75rem; color: rgba(17, 24, 39, 0.65); }

.tone-blue { background: rgba(168, 202, 224, 0.45); }
.tone-purple { background: rgba(214, 163, 209, 0.45); }
.tone-yellow { background: rgba(244, 205, 39, 0.42); }
.tone-blush { background: rgba(246, 225, 225, 0.9); }
</style>
