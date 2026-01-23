<script setup lang="ts">
definePageMeta({
    title: 'About · TaroTea'
})
</script>

<template>
    <main class="max-w-3xl mx-auto px-4 py-16 space-y-6">

        <h1 class="text-3xl font-semibold">
            About TaroTea
        </h1>

        <p class="text-gray-700">
            TaroTea is a simple, focused reference and example content app for aiding in learning everyday Cantonese.
        </p>

        <p class="text-gray-700">
            The goal is not to overwhelm with grammar or academic explanations,
            but to help learners recognise, understand, and remember the words and phrases
            we actually hear in real life. Hopefuly in a clear and approachable way.
        </p>

        <h2 class="text-xl font-semibold pt-2">
            Why it exists
        </h2>

        <p class="text-gray-700">
            Learning Cantonese can be frustrating. Many resources are scattered,
            outdated, or designed primarily for classroom study rather than real conversations.
        </p>

        <p class="text-gray-700">
            TaroTea aims to provide a calmer and more practical learning experience.
            One that supports steady progress at a comfortable pace, one word at a time.
        </p>

        <h2 class="text-xl font-semibold pt-2">
            Current state
        </h2>

        <p class="text-gray-700">
            The app is still a work in progress. New levels, content, and features are
            being added gradually as the platform continues to grow.
        </p>

        <p class="text-gray-700">
            Support from learners helps guide ongoing development and ensures the project
            can continue to improve over time.
        </p>

        <p class="text-gray-700">
            Sincerly, thank you to all those who support!
        </p>

        <div>
            <NuxtLink to="/levels" class="inline-block px-4 py-2 border rounded hover:bg-gray-50">
                Start learning →
            </NuxtLink>
        </div>

    </main>
</template>
