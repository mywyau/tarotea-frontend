<script setup lang="ts">

const route = useRoute()
const levelParam = route.params.level as string

const { data: index, error } = await useFetch(
    `/index/words/level/${levelParam}.json`,
    {
        key: 'level-one-characters',
        server: false
    }
)

</script>

<template>
    <main class="max-w-4xl mx-auto px-4 py-12">
        <!-- Header -->
        <div v-if="index" class="mb-8">
            <h1 class="text-3xl font-semibold mb-2">
                {{ index.title }}
            </h1>
            <p class="text-gray-600">
                {{ index.description }}
            </p>
        </div>

        <!-- Tiles -->
        <div v-if="index" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            <NuxtLink v-for="c in index.words" :key="c.word" :to="`/word/${c.word}`"
                class="border rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition">
                <div class="text-3xl mb-1">
                    {{ c.word }}
                </div>
                <div class="text-sm text-gray-400">
                    {{ c.jyutping }}
                </div>
                <div class="text-xs text-gray-500 mt-1 text-center">
                    {{ c.meaning }}
                </div>
            </NuxtLink>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-red-600">
            This page isn’t available yet.
        </div>

        <!-- Loading -->
        <div v-else class="text-gray-500">
            Loading…
        </div>
    </main>
</template>
