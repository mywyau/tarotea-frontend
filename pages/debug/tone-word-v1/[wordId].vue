<script setup lang="ts">
const route = useRoute()

await navigateTo({
  path: "/debug/tone-word-v1",
  query: {
    wordId: encodeURIComponent(String(route.params.wordId ?? "")),
  },
})
</script>

<template>
  <div class="p-6 text-sm text-slate-300">Redirecting…</div>
</template>
