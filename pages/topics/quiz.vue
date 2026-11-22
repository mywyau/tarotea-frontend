<script setup lang="ts">
useSeoMeta({
    title: 'Cantonese Topic Quizzes',
    description: 'Practice Cantonese topic quizzes with vocabulary, audio-only, and sentence modes.',
    ogTitle: 'Cantonese Topic Quizzes | TaroTea',
    ogDescription: 'Train Cantonese by topic with multiple quiz modes and adaptive repetition.',
})

import { BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Headphones, MessageSquareText, Volume2 } from '@lucide/vue'
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import { useMeStateV2 } from '~/composables/useMeStateV2'
import type { TopicQuiz } from '~/types/topic'
import { getTopicAppearance } from '~/utils/topics/icons'
import { sortedTopics } from '~/utils/topics/topics'

const {
    isLoggedIn,
    entitlement,
    resolve,
} = useMeStateV2()

const ITEMS_PER_PAGE = 8
const currentPage = ref(1)

const MAX_VISIBLE_PAGES = 4

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

const showFirstButton = computed(() => {
    return visiblePages.value.length > 0 && visiblePages.value[0] > 1
})

const showLastButton = computed(() => {
    return (
        visiblePages.value.length > 0 &&
        visiblePages.value[visiblePages.value.length - 1] < totalPages.value
    )
})

const totalPages = computed(() =>
    Math.ceil(sortedTopics.length / ITEMS_PER_PAGE)
)

const paginatedTopics = computed(() => {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return sortedTopics.slice(start, end)
})

function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function canEnterTopic(topic: TopicQuiz): boolean {

    // if (topic.comingSoon) return false

    // // ✅ Free topic → always accessible
    // if (!topic.quizRequiresPaid) return true

    // 🔒 Paid topic → requires login + entitlement
    // if (!isLoggedIn.value) return false

    // return canAccessTopicQuiz(isLoggedIn.value, entitlement.value, topic.id)
    // if (isLoggedIn.value) { return true } else { return false }
    return true
}

const topicQuizModes = [
    {
        id: 'vocab',
        label: 'Vocab',
        icon: markRaw(BookOpen),
        to: (topicId: string) => `/topic/quiz/vocabulary/word/start-quiz/${topicId}`,
    },
    {
        id: 'audio',
        label: 'Audio Only',
        icon: markRaw(Headphones),
        to: (topicId: string) => `/topic/quiz/vocabulary/audio/${topicId}/start-quiz`,
    },
    {
        id: 'sentences',
        label: 'Sentences',
        icon: markRaw(MessageSquareText),
        to: (topicId: string) => `/topic/quiz/sentences/no-audio/${topicId}/start-quiz`,
    },
    {
        id: 'sentences-audio',
        label: 'Audio Sentences',
        icon: markRaw(Volume2),
        to: (topicId: string) => `/topic/quiz/sentences/audio/${topicId}/start-quiz`,
    },
] as const

const selectedTopicQuizMode = ref<Record<string, number>>({})

function getSelectedTopicMode(topicId: string) {
    const modeIdx = selectedTopicQuizMode.value[topicId] ?? 0
    return topicQuizModes[modeIdx]
}

function getSelectedTopicModeIndex(topicId: string) {
    return selectedTopicQuizMode.value[topicId] ?? 0
}

function cycleTopicMode(topicId: string, direction: 1 | -1) {
    const current = selectedTopicQuizMode.value[topicId] ?? 0
    const total = topicQuizModes.length
    selectedTopicQuizMode.value[topicId] = (current + direction + total) % total
}


watch(sortedTopics, () => {
    currentPage.value = 1
})

onMounted(async () => {
    // Resolve auth once on mount (safe + idempotent)
    await resolve()
})

</script>

<template>
    <main class="topics-page max-w-4xl mx-auto py-10 px-4 space-y-8">



        <!-- Intro -->
        <header class="text-center space-y-3 max-w-4xl mx-auto">
            <h1 class="sr-only">Cantonese quizzes by topic</h1>
      <nav class="quiz-scope-nav" aria-label="Quiz type">
                <NuxtLink to="/quiz">Level quizzes</NuxtLink>
                <NuxtLink to="/topics/quiz" aria-current="page">Topic quizzes</NuxtLink>
            </nav>
        </header>

        <!-- Grid -->
        <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">

            <li v-for="topic in paginatedTopics" :key="topic.id" class="topic-card" :style="{ '--panel-background': getTopicAppearance(topic.id).background }">

                <!-- Header -->
                <div class="space-y-2 topic-card-copy">
                    <div class="topic-card-header">
                        <h2 class="text-lg font-semibold text-gray-900">
                            {{ topic.title }}
                        </h2>

                        <span class="quiz-topic-icon-wrap" role="img" :aria-label="`${topic.title} topic`">
                            <component :is="getTopicAppearance(topic.id).icon" class="quiz-topic-icon" aria-hidden="true" />
                        </span>
                    </div>

                    <p class="text-sm text-gray-600 leading-relaxed">
                        {{ topic.description }}
                    </p>

                    <p v-if="topic.comingSoon" class="text-xs text-gray-700 font-medium">
                        Coming soon
                    </p>
                </div>

                <!-- Buttons -->
                <div class="pt-4 space-y-3">
                    <div class="quiz-mode-selector">
                        <button type="button" @click="cycleTopicMode(topic.id, -1)"
                            aria-label="Previous quiz mode" :disabled="!canEnterTopic(topic) || topic.comingSoon">
                            <ChevronLeft class="h-5 w-5" aria-hidden="true" />
                        </button>

                        <NuxtLink :to="canEnterTopic(topic) ? getSelectedTopicMode(topic.id).to(topic.id) : undefined"
                            class="quiz-mode-link" :class="{ 'pointer-events-none opacity-60': topic.comingSoon || !canEnterTopic(topic) }">
                            <component :is="getSelectedTopicMode(topic.id).icon" class="quiz-mode-icon"
                                aria-hidden="true" />

                            <span>
                                {{ getSelectedTopicMode(topic.id).label }}
                            </span>
                        </NuxtLink>

                        <button type="button" @click="cycleTopicMode(topic.id, 1)"
                            aria-label="Next quiz mode" :disabled="!canEnterTopic(topic) || topic.comingSoon">
                            <ChevronRight class="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <div class="mode-dots"
                        :aria-label="`Mode ${getSelectedTopicModeIndex(topic.id) + 1} of ${topicQuizModes.length}`">
                        <span v-for="(mode, modeIndex) in topicQuizModes" :key="`${topic.id}-${mode.id}`"
                            class="quiz-mode-dot"
                            :class="{ 'is-active': modeIndex === getSelectedTopicModeIndex(topic.id) }" />
                    </div>
                </div>

                <p v-if="!canEnterTopic(topic)" class="text-xs text-center text-gray-500 pt-3">
                    Upgrade to unlock
                </p>

            </li>

        </ul>

        <div v-if="totalPages > 1" class="pagination-wrapper flex flex-col items-center gap-3 pt-8">
            <div class="pagination-row flex items-center justify-center gap-1.5 sm:gap-3 max-w-full overflow-x-auto">
                <button v-if="showFirstButton" @click="goToPage(1)" :disabled="currentPage === 1"
                    class="pagination-jump">
                    <ChevronsLeft class="h-4 w-4" aria-hidden="true" />
                </button>

                <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">
                    <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>

                <button v-for="page in visiblePages" :key="page" @click="goToPage(page)" class="pagination-page"
                    :class="{ 'is-active': page === currentPage }">
                    {{ page }}
                </button>

                <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                    class="pagination-arrow">
                    <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>

                <button v-if="showLastButton" @click="goToPage(totalPages)" :disabled="currentPage === totalPages"
                    class="pagination-jump">
                    <ChevronsRight class="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <p class="text-xs text-gray-500">
                Page {{ currentPage }} of {{ totalPages }}
            </p>
        </div>
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
    position: relative;
    isolation: isolate;
    overflow: hidden;
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

.topic-card::before {
    content: '';
    position: absolute;
    inset: -45%;
    z-index: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='172' height='92' viewBox='0 0 172 92'%3E%3Cg fill='%231f2937' opacity='.11' font-family='Arial,sans-serif' font-weight='700'%3E%3Ctext x='8' y='34' font-size='30'%3E%3F%3C/text%3E%3Ctext x='48' y='22' font-size='16'%3E%E2%9C%A6%3C/text%3E%3Ctext x='88' y='39' font-size='26'%3E%3F%3C/text%3E%3Ctext x='133' y='24' font-size='18'%3E%E2%97%87%3C/text%3E%3Ctext x='24' y='78' font-size='17'%3E%E2%9C%93%3C/text%3E%3Ctext x='68' y='70' font-size='28'%3E%3F%3C/text%3E%3Ctext x='121' y='81' font-size='17'%3E%E2%98%85%3C/text%3E%3C/g%3E%3C/svg%3E");
    background-size: 172px 92px;
    opacity: 0.55;
    transform: rotate(-18deg);
    transform-origin: center;
}

.topic-card>* {
    position: relative;
    z-index: 1;
}

.topic-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}


.topic-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

.topic-card-copy {
    padding-right: 2.25rem;
}

.quiz-topic-icon-wrap {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #374151;
}

.quiz-topic-icon {
    width: 1.65rem;
    height: 1.65rem;
    stroke-width: 2.35;
}

.quiz-mode-selector {
    display: grid;
    grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
    gap: 0.5rem;
}

.quiz-mode-selector > :is(a, button) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    border: 1px solid rgb(var(--color-muted));
    border-radius: var(--radius-control);
    background: rgb(var(--color-surface));
    color: rgb(var(--color-ink));
}

.quiz-mode-selector > :is(a, button:enabled):hover {
    border-color: rgb(var(--color-ink));
    background: #f5f5f5;
}

.quiz-mode-selector > :focus-visible {
    outline: 2px solid rgb(var(--color-ink));
    outline-offset: 2px;
}

.quiz-mode-selector > button:disabled {
    opacity: 0.4;
}

.quiz-mode-link {
    gap: 0.45rem;
    padding: 0.65rem 0.85rem;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.2;
}

.quiz-mode-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    stroke-width: 2.35;
}

.mode-dots {
    display: flex;
    justify-content: center;
    gap: 0.35rem;
}

.quiz-mode-dot {
    width: 0.45rem;
    height: 0.45rem;
    border: 1px solid rgb(var(--color-muted));
    border-radius: 9999px;
}

.quiz-mode-dot.is-active {
    width: 0.9rem;
    border-color: rgb(var(--color-ink));
    background: rgb(var(--color-ink));
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
.pagination-arrow,
.pagination-jump {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    line-height: 1;
}

/* Mobile first */
.pagination-page {
    min-width: 32px;
    height: 32px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    background-color: #F6E1E1;
    color: #1f2937;
    transition: all 0.18s ease;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.05);
}

.pagination-page:hover:not(.is-active) {
    background-color: #EAB8E4;
    transform: translateY(-1px);
}

.pagination-page.is-active {
    background-color: #D6A3D1;
    color: #000;
    box-shadow: 0 8px 20px rgba(214, 163, 209, 0.35);
    transform: translateY(-1px);
}

.pagination-arrow svg,
.pagination-jump svg {
    display: block;
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

.pagination-jump {
    min-width: 40px;
    height: 32px;
    padding: 0 8px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    background-color: rgba(168, 202, 224, 0.45);
    color: #1f2937;
    transition: all 0.18s ease;
}

.pagination-jump:hover:not(:disabled) {
    background-color: rgba(168, 202, 224, 0.65);
    transform: translateY(-1px);
}

.pagination-jump:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Tablet and up */
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

    .pagination-jump {
        min-width: 48px;
        height: 38px;
        border-radius: 12px;
        font-size: 0.85rem;
    }
}
</style>
