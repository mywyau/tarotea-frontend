<!-- <script setup lang="ts">
const props = defineProps<{
  id: string
}>()

const { data: word } = await useFetch(
  `/content/cantonese/words/${props.id}.json`,
  {
    key: `word-${props.id}`,
    server: false
  }
)
</script>

<template>
  <NuxtLink v-if="word" :to="`/word/${props.id}`" class="border rounded-lg p-4 hover:bg-gray-50 transition space-y-1">
    <div class="text-xl text-center">
      {{ word.word }}
    </div>
    <div class="text-sm text-gray-400 text-center">
      {{ word.jyutping }}
    </div>
    <div class="text-xs text-gray-500 text-center">
      {{ word.meaning }}
    </div>
  </NuxtLink>

  <!-- Optional: loading state -->
  <!-- <div v-else class="border rounded-lg p-4 text-center text-gray-300"> -->
    <!-- … -->
  <!-- </div> -->
<!-- </template>  -->


<script setup lang="ts">
defineProps<{
  word: string
  jyutping: string
  meaning: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/word/${word}`"
    class="border rounded-lg p-4 hover:bg-gray-50 transition space-y-1"
  >
    <div class="text-xl text-center">
      {{ word }}
    </div>
    <div class="text-sm text-gray-400 text-center">
      {{ jyutping }}
    </div>
    <div class="text-xs text-gray-500 text-center">
      {{ meaning }}
    </div>
  </NuxtLink>
</template>
