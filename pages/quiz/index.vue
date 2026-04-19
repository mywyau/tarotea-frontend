<script setup lang="ts">
import { levelSelectMetaData } from '@/utils/levels/helpers'
import { onMounted } from 'vue'

const { authReady, resolve } = useMeStateV2()

onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

const quizTypes = [
  { id: 'word', label: 'Vocabulary', hint: 'Word recognition', className: 'tone-blue' },
  { id: 'audio', label: 'Audio', hint: 'Listening focus', className: 'tone-purple' },
  { id: 'sentences', label: 'Sentences', hint: 'Meaning in context', className: 'tone-yellow' },
  { id: 'sentences-audio', label: 'Sentence Audio', hint: 'Audio + context', className: 'tone-blush' },
]

function routeFor(levelId: string, quizId: string) {
  if (quizId === 'word') return `/quiz/${levelId}/word/start-quiz`
  if (quizId === 'audio') return `/quiz/${levelId}/audio/start-quiz`
  if (quizId === 'sentences') return `/quiz/${levelId}/sentences/no-audio/v3/start-quiz`
  return `/quiz/${levelId}/sentences/audio/v3/start-quiz`
}

const canEnterLevel = () => true
</script>

<template>
  <main class="quiz-selector max-w-5xl mx-auto py-10 px-4 space-y-8">
    <BackLink />

    <header class="space-y-3">
      <h1 class="page-title">Choose your quiz mode</h1>
      <p class="page-subtitle">
        Pick a level, then choose how you want to practice: word, audio, sentence, or sentence-audio.
      </p>

      <div class="mode-chips">
        <span v-for="mode in quizTypes" :key="mode.id" class="chip" :class="mode.className">
          {{ mode.label }} · {{ mode.hint }}
        </span>
      </div>
    </header>

    <ul class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <li
        v-for="quizLevel in levelSelectMetaData"
        :key="quizLevel.id"
        class="level-card"
        :class="quizLevel.comingSoon ? 'is-locked' : ''"
      >
        <div>
          <div class="card-top">
            <h2 class="card-title">{{ quizLevel.title }}</h2>
            <span v-if="quizLevel.comingSoon" class="pill">Coming soon</span>
          </div>

          <p class="card-description">{{ quizLevel.description }}</p>
        </div>

        <div v-if="canEnterLevel() && !quizLevel.comingSoon" class="mode-grid">
          <NuxtLink
            v-for="mode in quizTypes"
            :key="mode.id"
            :to="routeFor(quizLevel.id, mode.id)"
            class="mode-btn"
            :class="mode.className"
          >
            <span class="mode-label">{{ mode.label }}</span>
            <span class="mode-hint">{{ mode.hint }}</span>
          </NuxtLink>
        </div>

        <p v-else class="locked-copy">Upgrade to unlock this level.</p>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.page-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.74);
  max-width: 52rem;
}

.mode-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.chip {
  font-size: 0.74rem;
  border-radius: 999px;
  padding: 0.33rem 0.68rem;
  font-weight: 600;
  color: #1f2937;
}

.level-card {
  border-radius: 20px;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(17, 24, 39, 0.07);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.level-card.is-locked { opacity: 0.65; }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}

.pill {
  font-size: 0.69rem;
  border-radius: 999px;
  background: #F6E1E1;
  color: #374151;
  padding: 0.22rem 0.58rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.card-description {
  margin-top: 0.4rem;
  font-size: 0.88rem;
  color: rgba(17, 24, 39, 0.76);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.mode-btn {
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  transition: transform 0.14s ease, filter 0.14s ease;
}

.mode-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.mode-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: #1f2937;
}

.mode-hint {
  font-size: 0.74rem;
  color: rgba(17, 24, 39, 0.72);
}

.locked-copy {
  font-size: 0.78rem;
  color: rgba(17, 24, 39, 0.72);
}

.tone-blue { background: rgba(168, 202, 224, 0.45); }
.tone-purple { background: rgba(214, 163, 209, 0.45); }
.tone-yellow { background: rgba(244, 205, 39, 0.42); }
.tone-blush { background: rgba(246, 225, 225, 0.9); }
</style>
