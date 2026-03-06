<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { useMeStateV2 } from '~/composables/useMeStateV2'
import type { TopicQuiz } from '~/types/topic'
import { canAccessTopicQuiz } from '~/utils/topics/permissions'
import { sortedTopics } from '~/utils/topics/topics'

const {
    state,
    authReady,
    isLoggedIn,
    user,
    entitlement,
    hasPaidAccess,
    isCanceling,
    currentPeriodEnd,
    resolve,
} = useMeStateV2()

const ITEMS_PER_PAGE = 9
const currentPage = ref(1)

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

    if (topic.comingSoon) return false

    // ✅ Free topic → always accessible
    if (!topic.quizRequiresPaid) return true

    // 🔒 Paid topic → requires login + entitlement
    if (!isLoggedIn.value) return false

    return canAccessTopicQuiz(isLoggedIn.value, entitlement.value, topic.id)
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
    <main class="topics-page max-w-6xl mx-auto py-10 px-4 space-y-8">

        <div class="mb-6">
            <NuxtLink :to="`/`" class="text-black text-sm hover:underline">
                ← Home
            </NuxtLink>
        </div>

        <!-- Intro -->
        <header class="text-center space-y-3 max-w-2xl mx-auto">
            <h1 class="text-3xl font-semibold text-gray-900">
                Topic Quiz
            </h1>
            <p class="text-gray-600 text-sm sm:text-base">
                Practice Cantonese by topic. Your weakest words appear more often as you improve.
            </p>
        </header>

        <div v-if="totalPages > 1" class="flex justify-center items-center gap-3 pt-8">
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
        <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            <li v-for="topic in paginatedTopics" :key="topic.id" class="topic-card" :class="[
                topic.comingSoon || (topic.quizRequiresPaid && !canEnterTopic(topic))
                    ? 'topic-locked'
                    : ''
            ]">

                <!-- Header -->
                <div class="space-y-2">
                    <h2 class="text-lg font-semibold text-gray-900">
                        {{ topic.title }}
                    </h2>

                    <p class="text-sm text-gray-600 leading-relaxed">
                        {{ topic.description }}
                    </p>

                    <p v-if="topic.comingSoon" class="text-xs text-gray-400 font-medium">
                        Coming soon
                    </p>
                </div>

                <!-- Buttons -->
                <div class="grid grid-cols-2 gap-3 pt-4">

                    <NuxtLink :to="canEnterTopic(topic) ? `/topic/quiz/vocabulary/word/v3/${topic.id}` : undefined"
                        class="topic-btn topic-btn-blue"
                        :class="{ 'pointer-events-none opacity-60': topic.comingSoon }">
                        Vocab
                    </NuxtLink>

                    <NuxtLink :to="canEnterTopic(topic) ? `/topic/quiz/vocabulary/audio/v3/${topic.id}` : undefined"
                        class="topic-btn topic-btn-purple"
                        :class="{ 'pointer-events-none opacity-60': topic.comingSoon }">
                        Audio
                    </NuxtLink>

                    <NuxtLink :to="canEnterTopic(topic) ? `/topic/quiz/sentences/${topic.id}` : undefined"
                        class="topic-btn topic-btn-yellow col-span-2"
                        :class="{ 'pointer-events-none opacity-60': topic.comingSoon }">
                        Sentences
                    </NuxtLink>

                </div>

                <p v-if="!canEnterTopic(topic)" class="text-xs text-center text-gray-500 pt-3">
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

/* Card */
.topic-card {
    border-radius: 24px;
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
    text-align: center;
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 14px;
    font-weight: 600;
    transition: all 0.15s ease;
}

/* Colour variations */
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

/* Pagination */

.pagination-page {
    min-width: 40px;
    height: 40px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 0.9rem;

    background-color: #F6E1E1;
    /* blush */
    color: #1f2937;

    transition: all 0.18s ease;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.05);
}

.pagination-page:hover {
    background-color: #EAB8E4;
    transform: translateY(-2px);
}

.pagination-page.is-active {
    background-color: #D6A3D1;
    box-shadow: 0 8px 20px rgba(214, 163, 209, 0.35);
    transform: translateY(-2px);
}

.pagination-arrow {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    font-weight: 600;

    background-color: rgba(244, 205, 39, 0.45);
    color: #1f2937;

    transition: all 0.18s ease;
}

.pagination-arrow:hover:not(:disabled) {
    background-color: rgba(244, 205, 39, 0.65);
    transform: translateY(-2px);
}

.pagination-arrow:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>