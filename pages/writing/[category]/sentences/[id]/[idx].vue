<script setup lang="ts">
definePageMeta({ ssr: false, middleware: ['word-access'] })

const route = useRoute()
const wordId = computed(() => route.params.id as string)
const sentenceIndex = computed(() => Number(route.params.idx))
const { data: word, pending, error } = await useAsyncData(
  () => `writing-word-${wordId.value}`,
  () => fetchLessonWord(wordId.value),
  { server: false },
)
const example = computed(() => word.value?.examples?.[sentenceIndex.value])
const errorMessage = computed(() => {
  if (error.value || !word.value) return 'Could not load this word.'
  if (!example.value) return 'Sentence not found.'
})
</script>

<template>
  <WritingPractice :key="`${wordId}/${sentenceIndex}`" kind="sentence" :text="example?.sentence" :jyutping="example?.jyutping"
    :meaning="example?.meaning" :pending="pending" :error-message="errorMessage" />
</template>
