<script setup lang="ts">
const route = useRoute()
const level = route.params.level as string

const { data: index, error } = await useFetch(
  `/index/level/${level}.json`,
  {
    key: `level-${level}`
  }
)

if (error.value || !index.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Level not available'
  })
}

const safeIndex = computed(() => index.value!)
</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">
    <h1 class="text-3xl font-semibold mb-2">
      {{ safeIndex.title }}
    </h1>

    <p class="text-gray-600 mb-8">
      {{ safeIndex.description }}
    </p>

    <ul class="space-y-4">
      <li v-for="item in safeIndex.items ?? []" :key="item.id" class="border-b pb-3">
        <NuxtLink :to="`/item/${item.id}`" class="block hover:bg-gray-50 rounded p-2">
          <RubyText :text="item.sentence" :ruby="item.jyutping" />
          <div class="text-sm text-gray-500">
            {{ item.english }}
          </div>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
