<script setup lang="ts">
import WordTile from '@/components/WordTile.vue'
import { useUpgrade } from '@/composables/useUpgrade'
import { canAccessLevel } from '@/utils/access'
import { getLevelNumber } from '@/utils/levels'


const route = useRoute()
const slug = computed(() => route.params.slug as string)

const levelNumber = getLevelNumber(slug.value)
if (!levelNumber) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

const me = await useMe()
const hasAccess = canAccessLevel(levelNumber, me)

// IMPORTANT: ensure this matches what /api/me returns.
// If /api/me returns { id: "..."} you're good.
// If it returns { user_id: "..."} then change me?.id accordingly.

const headers = computed(() => {
  if (!me?.id) return undefined
  return { 'x-user-id': me.id }
})

const { data: topic, error, pending } = await useFetch(
  () => (hasAccess ? `/api/index/levels/${slug.value}` : null),
  {
    key: () => `index-level-${slug.value}`,
    server: false,
    headers
  }
)

const safeTopic = computed(() => topic.value)

const categories = computed(() => {
  if (!safeTopic.value?.categories) return []
  return Object.entries(safeTopic.value.categories).map(([key, words]) => ({
    key,
    title: key.replace(/_/g, ' '),
    words
  }))
})
</script>

<template>
  <main class="max-w-4xl mx-auto px-4 py-12 space-y-12">
    <!-- 🔒 ACCESS DENIED (do NOT depend on safeTopic) -->
    <section v-if="!hasAccess" class="text-center space-y-4">
      <h1 class="text-3xl font-semibold">
        🔒 Level locked
      </h1>

      <p class="text-gray-600">
        This level is part of Tarotea Pro.
      </p>

      <button v-if="!me" class="mt-4 px-4 py-2 rounded bg-blue-600 text-white" @click="loginWithGoogle" type="button">
        Sign in to unlock
      </button>


    </section>

    <!-- ✅ ACCESS GRANTED -->
    <template v-else>
      <div v-if="pending" class="text-gray-600">
        Loading…
      </div>

      <div v-else-if="error" class="text-red-600">
        {{ error.statusMessage || 'Failed to load level' }}
      </div>

      <template v-else-if="safeTopic">
        <!-- Level header -->
        <header class="space-y-2">
          <h1 class="text-3xl font-semibold">
            {{ safeTopic.title }}
          </h1>

          <p class="text-gray-600">
            {{ safeTopic.description }}
          </p>
        </header>

        <!-- Categories -->
        <section v-for="category in categories" :key="category.key" class="space-y-4">
          <h2 class="text-xl font-medium capitalize">
            {{ category.title }}
          </h2>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <WordTile v-for="word in category.words" :key="word.word" :to="`/level/${slug}/word/${word.id}`"
              :word="word.word" :jyutping="word.jyutping" :meaning="word.meaning" />
          </div>
        </section>
      </template>
    </template>
  </main>
</template>
