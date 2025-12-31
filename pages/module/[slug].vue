<script setup>
const route = useRoute()
const modules = await $fetch('/index/modules.json')
const module = modules[route.params.slug]
</script>

<template>
  <main class="max-w-xl mx-auto py-12">
    <h1 class="text-2xl mb-6">{{ module.title }}</h1>

    <ul class="space-y-3">
      <li v-for="id in module.items" :key="id">
        <NuxtLink :to="`/item/${id}`" class="underline">
          {{ id }}
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>

