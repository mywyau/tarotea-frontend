<script setup lang="ts">
definePageMeta({
  ssr: true,
  // middleware: ['level-access'],
})

const route = useRoute()
const router = useRouter()

const slug = route.params.slug as string
const wordId = route.params.wordId as string

const loading = ref(false)
const errorMessage = ref('')

const unlockSummary = ref({
  totalXp: 0,
  creditsEarned: 0,
  creditsSpent: 0,
  creditsAvailable: 0,
})

const word = ref<null | {
  id: string
  word: string
  jyutping?: string
  meaning?: string
}>(null)

async function loadData() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const unlocks = await $fetch<{
      totalXp: number
      creditsEarned: number
      creditsSpent: number
      creditsAvailable: number
      unlockedWordIds: string[]
    }>('/api/word-unlocks', {
      query: { wordIds: wordId },
      headers: { Authorization: `Bearer ${token}` }
    })

    unlockSummary.value = {
      totalXp: unlocks.totalXp,
      creditsEarned: unlocks.creditsEarned,
      creditsSpent: unlocks.creditsSpent,
      creditsAvailable: unlocks.creditsAvailable,
    }

    // fetch word details however your app already does it
    word.value = await $fetch(`/api/words/${wordId}`)
  } catch {
    errorMessage.value = 'Failed to load unlock details.'
  }
}

async function unlockWord() {
  try {
    loading.value = true
    errorMessage.value = ''

    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    await $fetch('/api/word-unlocks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { wordId }
    })

    await router.push(`/level/${slug}/word/${wordId}`)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? 'Failed to unlock word.'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <main class="max-w-xl mx-auto px-4 py-10 space-y-6">
    <BackLink :to="`/level/${slug}/v2`" />

    <header>
      <h1 class="text-xl uppercase tracking-wide">Unlock word</h1>
      <p class="text-sm opacity-70">
        Use 1 unlock credit to access this word permanently.
      </p>
    </header>

    <div v-if="word" class="rounded-xl border p-5 space-y-2">
      <div class="text-2xl">{{ word.word }}</div>
      <div class="text-sm opacity-70">{{ word.jyutping }}</div>
      <div class="text-sm">{{ word.meaning }}</div>
    </div>

    <div class="rounded-xl border p-5 space-y-2 text-sm">
      <div>Total XP: {{ unlockSummary.totalXp }}</div>
      <div>Credits earned: {{ unlockSummary.creditsEarned }}</div>
      <div>Credits used: {{ unlockSummary.creditsSpent }}</div>
      <div>Credits available: {{ unlockSummary.creditsAvailable }}</div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">
      {{ errorMessage }}
    </p>

    <button class="rounded-full px-4 py-2 bg-black text-white disabled:opacity-50"
      :disabled="loading || unlockSummary.creditsAvailable < 1" @click="unlockWord">
      {{ loading ? 'Unlocking...' : 'Unlock word' }}
    </button>
  </main>
</template>