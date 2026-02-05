<script setup lang="ts">
import { patchNotes } from '@/utils/patchNotes'

definePageMeta({
  title: 'What’s new · TaroTea'
})
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-16 space-y-12">

    <header class="space-y-3 text-center">
      <h1 class="text-3xl font-semibold">
        What’s new
      </h1>

      <p class="text-gray-600">
        Small, steady improvements to help communicate changes to the App.
      </p>
    </header>

    <section
      v-for="note in patchNotes"
      :key="note.date"
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

  </main>
</template>
