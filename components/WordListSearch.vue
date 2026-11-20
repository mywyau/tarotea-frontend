<script setup lang="ts">
defineProps<{ scope: 'topic' | 'level', hasMatches: boolean }>()
const query = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <label class="block">
      <span class="mb-2 block font-semibold">Search this {{ scope }}</span>
      <input
        v-model="query"
        type="search"
        placeholder="Cantonese, English or Jyutping"
        class="w-full rounded-control border border-app-ink/25 bg-app-surface px-4 py-2.5 text-app-ink placeholder:text-app-muted focus:outline-app-primary"
      />
    </label>
    <p role="status" class="text-sm text-app-muted">
      <span v-if="query.trim() && !hasMatches" class="mt-3 block">No matching words in this {{ scope }}.</span>
    </p>
  </div>
</template>
