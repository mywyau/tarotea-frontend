<script setup lang="ts">
definePageMeta({ ssr: false, middleware: ['word-access'] })

type VocabWord = { id: string; word: string; jyutping?: string; meaning?: string }

const route = useRoute()
const wordId = computed(() => route.params.id as string)
const { data: word, pending, error } = await useFetch<VocabWord>(() => `/api/words/${wordId.value}`, {
  key: () => `word-${wordId.value}`,
  watch: [wordId],
})
</script>

<template>
  <WritingPractice :key="wordId" kind="word" :text="word?.word" :jyutping="word?.jyutping" :meaning="word?.meaning"
    :pending="pending" :error-message="error || !word ? 'Could not load this word.' : undefined" />
</template>
