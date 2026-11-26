<script setup lang="ts">
definePageMeta({ ssr: false, middleware: ['word-access'] })

const route = useRoute()
const wordId = computed(() => route.params.id as string)
const { data: word, pending, error } = await useAsyncData(
  () => `writing-word-${wordId.value}`,
  () => fetchLessonWord(wordId.value),
  { server: false },
)
</script>

<template>
  <WritingPractice :key="wordId" kind="word" :text="word?.word" :jyutping="word?.jyutping" :meaning="word?.meaning"
    :pending="pending" :error-message="error || !word ? 'Could not load this word.' : undefined" />
</template>
