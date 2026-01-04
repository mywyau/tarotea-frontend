<script setup lang="ts">
import RubyText from '@/components/RubyText.vue'

const route = useRoute()
const wordParam = computed(() => route.params.word as string)

const { data: word, error, pending } = await useFetch(
  () => `/api/words/level/${wordParam.value}`,
  {
    key: () => `words-level-${wordParam.value}`,
    server: true
  }
)

if (error.value || !item.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Item not found'
  })
}

const safeItem = computed(() => item.value!)
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-12 space-y-10">
    <!-- Sentence -->
    <section class="text-center space-y-2">
      <h1 class="text-gray-500 text-lg py-2">
        {{ safeItem.english }}
      </h1>

      <RubyText
        :text="safeItem.sentence"
        :ruby="safeItem.jyutping"
        textClass="text-3xl leading-loose"
        rubyClass="text-base text-gray-400 tracking-wide"
      />
    </section>

    <!-- Usage -->
    <section>
      <h2 class="text-lg font-semibold mb-3">
        Usage
      </h2>

      <ul class="list-disc pl-5 space-y-2 text-gray-700">
        <li
          v-for="note in safeItem.usage ?? []"
          :key="note"
        >
          {{ note }}
        </li>
      </ul>
    </section>

    <!-- Alternatives -->
    <section
      v-if="safeItem.alternatives?.length"
      class="border-t pt-6"
    >
      <h2 class="text-lg font-semibold mb-3">
        Alternatives
      </h2>

      <ul class="space-y-3">
        <li
          v-for="alt in safeItem.alternatives ?? []"
          :key="alt.sentence"
          class="text-gray-700"
        >
          <RubyText
            :text="alt.sentence"
            :ruby="alt.jyutping"
            textClass="text-3xl leading-loose"
          />
          <div class="text-sm text-gray-500">
            {{ alt.note }}
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>
