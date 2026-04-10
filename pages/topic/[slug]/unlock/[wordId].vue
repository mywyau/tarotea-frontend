<script setup lang="ts">
definePageMeta({
  ssr: true,
  // middleware: ['coming-soon'],
})

const route = useRoute()

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

const showUnlockPanel = ref(false)

function openUnlockPanel() {
  if (loading.value) return
  if (unlockSummary.value.creditsAvailable < 1) return

  errorMessage.value = ''
  showUnlockPanel.value = true
}

function closeUnlockPanel() {
  if (loading.value) return

  showUnlockPanel.value = false
  errorMessage.value = ''
}

const wordApiPath: string = `/api/words/${wordId}`
const wordPagePath: string = `/topic/word/${slug}/${wordId}`

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

    word.value = await $fetch(wordApiPath)
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

    showUnlockPanel.value = false
    await navigateTo(wordPagePath)
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

    <BackLink :to="`/topic/words/${slug}/v2`" />

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
      <p v-if="word.meaning" class="word-meaning font-bold mt-3">{{ word.meaning }}</p>
    </section>

    <section class="stats-grid">
      <div class="stat-card page-card rounded-xl stat-0">
        <p class="stat-label">XP</p>
        <p class="stat-value font-bold">{{ unlockSummary.totalXp }}</p>
      </div>

      <div class="stat-card page-card rounded-lg stat-1">
        <p class="stat-label">TaroKeys available</p>
        <p class="stat-value font-bold">{{ unlockSummary.creditsAvailable }}</p>
      </div>

      <div class="stat-card page-card rounded-lg stat-2">
        <p class="stat-label">TaroKeys used</p>
        <p class="stat-value font-bold">{{ unlockSummary.creditsSpent }}</p>
      </div>
    </section>

    <div v-if="errorMessage" class="error-card page-card rounded-lg">
      {{ errorMessage }}
    </div>

    <section class="rounded-lg border p-5 space-y-4"
      style="background: rgba(168,202,224,0.22); border-color: rgba(17,24,39,0.12);">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold text-gray-900">Unlock tile</h2>

          <p class="mt-4 text-sm text-gray-700">
            Unlock this tile permanently by using
            <span class="font-semibold">1 TaroKey</span>.
          </p>
        </div>

        <span class="text-xs font-semibold text-gray-900 rounded-lg px-3 py-1 bg-blue-300/80">
          Permanent
        </span>
      </div>

      <div class="space-y-2 text-sm text-gray-700">
        <p>This tile will be added to your permanent study pool.</p>
      </div>

      <div class="pt-2">
        <button v-if="!showUnlockPanel" type="button"
          class="w-full rounded-lg py-3 font-semibold border border-black/10 text-gray-900 bg-white/70 backdrop-blur hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || unlockSummary.creditsAvailable < 1" @click="openUnlockPanel">
          Show unlock options
        </button>

        <Transition name="reveal-panel">
          <div v-if="showUnlockPanel" class="space-y-4">
            <div class="rounded-lg border px-4 py-3 text-sm text-gray-800 bg-white/75 border-black/10">
              <p>
                Spend <span class="font-semibold">1 TaroKey</span> to unlock
                <span class="font-semibold">{{ word?.word ?? 'this tile' }}</span>?
              </p>

              <p class="mt-2 text-gray-600">
                You currently have
                <span class="font-semibold">{{ unlockSummary.creditsAvailable }}</span>
                TaroKey<span v-if="unlockSummary.creditsAvailable !== 1">s</span> available.
              </p>
            </div>

            <div v-if="errorMessage" class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {{ errorMessage }}
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <button type="button"
                class="confirm-btn-blush w-full rounded-lg py-3 font-semibold hover:brightness-110 hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loading || unlockSummary.creditsAvailable < 1" @click="unlockWord">
                {{ loading ? 'Unlocking…' : 'Confirm unlock' }}
              </button>

              <button type="button"
                class="w-full rounded-lg py-3 font-semibold border border-gray-300 text-gray-800 bg-white/70 backdrop-blur hover:bg-white transition"
                :disabled="loading" @click="closeUnlockPanel">
                Cancel
              </button>
            </div>
          </div>
        </Transition>

        <p v-if="unlockSummary.creditsAvailable < 1" class="helper-text mt-3">
          You do not have enough TaroKeys yet.
        </p>
      </div>
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

.stat-0 {
  background: rgba(234, 184, 228, 0.45);
}

.stat-1 {
  background: rgba(168, 202, 224, 0.45);
}

.stat-2 {
  background: rgba(244, 205, 39, 0.35);
}

.confirm-btn-blush {
  background: rgb(126, 147, 255);
}
</style>