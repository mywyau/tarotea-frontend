<script setup lang="ts">
const route = useRoute()

// level will be "level 1", "level 2", etc.
const level = route.params.level as string

const { data: index, error } = await useFetch(
  `/index/level/${level}.json`,
  {
    key: `level-${level}`,
    server: false
  }
)
</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">
    <!-- Success -->
    <div v-if="index">
      <h1 class="text-3xl font-semibold mb-2">
        {{ index.title }}
      </h1>

      <p class="text-gray-600 mb-8">
        {{ index.description }}
      </p>

      <ul class="space-y-4">
        <li v-for="item in index.items" :key="item.id" class="border-b pb-3">
          <NuxtLink :to="`/item/${item.id}`" class="block hover:bg-gray-50 rounded p-2">
            <RubyText :text="item.sentence" :ruby="item.jyutping" />
            <div class="text-sm text-gray-500">
              {{ item.english }}
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <!-- Error -->
    <div v-else-if="error">
      <p class="text-red-600">
        This Level isn’t available yet.
      </p>
      <NuxtLink to="/" class="underline">
        Go home
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-else>
      <p class="text-gray-500">Loading…</p>
    </div>
  </main>
</template>
