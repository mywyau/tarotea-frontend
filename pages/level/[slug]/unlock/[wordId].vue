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
  <main class="unlock-page max-w-2xl mx-auto px-4 py-10 sm:py-12 space-y-8">
    <BackLink :to="`/level/${slug}/v2`" />

    <header class="rounded-lg header-card">
      <h1 class="page-heading">Unlock word</h1>
      <p class="page-subheading mt-2">
        Use <span class="font-bold"> 1 </span> TaroKey to access this Tile permanently.
      </p>
    </header>

    <section v-if="word" class="rounded-lg text-center">
      <p class="word-label">Tile</p>
      <h2 class="word-text mt-2">{{ word.word }}</h2>
      <p v-if="word.jyutping" class="word-jyutping mt-2">{{ word.jyutping }}</p>
      <p v-if="word.meaning" class="word-meaning mt-3">{{ word.meaning }}</p>
    </section>

    <section class="stats-grid">
      <div class="stat-card page-card rounded-lg">
        <p class="stat-label">Total XP</p>
        <p class="stat-value">{{ unlockSummary.totalXp }}</p>
      </div>

      <div class="stat-card page-card rounded-lg">
        <p class="stat-label">TaroKeys available</p>
        <p class="stat-value">{{ unlockSummary.creditsAvailable }}</p>
      </div>

      <div class="stat-card page-card rounded-lg">
        <p class="stat-label">TaroKeys used</p>
        <p class="stat-value">{{ unlockSummary.creditsSpent }}</p>
      </div>
    </section>

    <div v-if="errorMessage" class="error-card page-card rounded-lg">
      {{ errorMessage }}
    </div>

    <section class="rounded-lg text-center space-y-4">
      <p class="action-text">
        Unlock this word and add it to your permanent study pool for this level.
      </p>

      <button class="rounded-lg bg-black text-white py-2 px-4" :disabled="loading || unlockSummary.creditsAvailable < 1"
        @click="unlockWord">
        {{ loading ? 'Unlocking...' : 'Unlock word' }}
      </button>

      <p v-if="unlockSummary.creditsAvailable < 1" class="helper-text">
        You do not have enough TaroKeys yet.
      </p>
    </section>
  </main>
</template>

<style scoped>
.unlock-page {
  --pink: #eab8e4;
  --purple: #d6a3d1;
  --blue: #a8cae0;
  --yellow: #f4cd27;
  --blush: #f6e1e1;

  padding-bottom: 2rem;
}

.page-card {
  backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(17, 24, 39, 0.08);
  padding: 1.1rem;
}

.page-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.page-subheading {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.word-card {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.word-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(17, 24, 39, 0.6);
}

.word-text {
  font-size: 2rem;
  line-height: 1.1;
  color: rgba(0, 0, 0);
}

.word-jyutping {
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: rgba(17, 24, 39, 0.7);
}

.word-meaning {
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.85);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-card {
  text-align: center;
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(17, 24, 39, 0.62);
}

.stat-value {
  margin-top: 0.45rem;
  font-size: 1.05rem;
  color: rgba(0, 0, 0);
}

.action-card {
  padding-top: 1.4rem;
  padding-bottom: 1.4rem;
}

.action-text {
  font-size: 0.9rem;
  color: rgba(17, 24, 39, 0.82);
}

.unlock-button {
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1.2rem;
  min-width: 12rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(17, 24, 39, 0.96);
  color: white;
  cursor: pointer;
  transition: transform 0.14s ease, opacity 0.14s ease;
}

.unlock-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.unlock-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.helper-text {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(17, 24, 39, 0.6);
}

.error-card {
  background: rgba(255, 240, 240, 0.8);
  border: 1px solid rgba(220, 38, 38, 0.18);
  color: rgb(185, 28, 28);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .word-text {
    font-size: 1.8rem;
  }

  .unlock-button {
    width: 100%;
    min-width: 0;
  }
}
</style>