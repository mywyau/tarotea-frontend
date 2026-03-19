<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { patchNotes } from '@/utils/patchNotes'

definePageMeta({
  title: 'What’s new · TaroTea'
})

const route = useRoute()
const router = useRouter()

const NOTES_PER_PAGE = 5

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(patchNotes.length / NOTES_PER_PAGE))
})

const currentPage = computed(() => {
  const raw = Number(route.query.page ?? 1)

  if (!Number.isFinite(raw)) return 1

  return Math.min(Math.max(1, Math.floor(raw)), totalPages.value)
})

const paginatedNotes = computed(() => {
  const start = (currentPage.value - 1) * NOTES_PER_PAGE
  const end = start + NOTES_PER_PAGE
  return patchNotes.slice(start, end)
})

const pageNumbers = computed(() => {
  return Array.from({ length: totalPages.value }, (_, i) => i + 1)
})

async function goToPage(page: number) {
  const safePage = Math.min(Math.max(1, page), totalPages.value)

  await router.replace({
    query: {
      ...route.query,
      page: safePage === 1 ? undefined : String(safePage)
    }
  })
}

watchEffect(() => {
  const raw = Number(route.query.page ?? 1)

  if (!Number.isFinite(raw) || raw < 1 || raw > totalPages.value) {
    router.replace({
      query: {
        ...route.query,
        page: currentPage.value === 1 ? undefined : String(currentPage.value)
      }
    })
  }
})
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-16 space-y-12">

    <header class="space-y-3 text-center">
      <h1 class="text-3xl font-semibold">
        Patch Notes
      </h1>

      <p class="text-gray-600">
        Improvements, features and updates
      </p>
    </header>

    <section
      v-for="note in paginatedNotes"
      :key="`${note.date}-${note.title ?? ''}`"
      class="space-y-4"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          {{ note.date }}
        </h2>

        <span
          v-if="note.title"
          class="text-sm text-gray-500"
        >
          — {{ note.title }}
        </span>
      </div>

      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li
          v-for="item in note.items"
          :key="item"
        >
          {{ item }}
        </li>
      </ul>
    </section>

    <nav
      v-if="totalPages > 1"
      class="flex flex-col items-center gap-4 pt-4"
      aria-label="Patch notes pagination"
    >
      <div class="flex items-center gap-2 flex-wrap justify-center">
        <button
          class="px-4 py-2 rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-800"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          Previous
        </button>

        <button
          v-for="page in pageNumbers"
          :key="page"
          class="min-w-10 h-10 px-3 rounded-lg text-sm font-medium transition"
          :class="page === currentPage
            ? 'bg-black text-white'
            : 'text-black hover:bg-gray-50'"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <button
          class="px-4 py-2 rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-800"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </nav>

  </main>
</template>