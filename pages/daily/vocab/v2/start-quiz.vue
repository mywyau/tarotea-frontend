<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: "logged-in",
})

const primaryTips = [
  {
    title: "Gain XP from every correct answer",
    body: "The Daily Vocab Quiz gives XP for correct answers and helps grow your streaks over time.",
  },
  {
    title: "Wrong answers reset progress for that word",
    body: "If you miss a question, that word's streak resets for this session and you miss out on bonus XP.",
  },
  {
    title: "Complete all 20 questions",
    body: "Finish the full daily run to lock in your final result and keep your daily consistency strong.",
  },
]

const scoringTips = [
  "Streaks are tracked per word.",
  "Lower XP words are prioritized more often.",
  "Base correct-answer XP starts at 5.",
  "You do not lose any xp for incorrect answers.",
  "Streaks increase XP for repeated correct answers.",
  "Streak XP: 5 → 7 → 9 → 13 → 15.",
  "Questions are randomized each session.",
  "Practice both Cantonese → English and English → Cantonese.",
  "Your daily set refreshes at UTC midnight.",
]

</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <BackLink />

    <section class="quiz-card text-center space-y-6">
      <h1 class="text-3xl font-semibold text-gray-900 level-heading">
        Daily 20 Questions
      </h1>

      <p class="text-black level-subheading">
        Practice your daily vocabulary review set and build steady XP.
      </p>

      <div class="pt-6">
        <NuxtLink to="/daily/vocab/v2" class="start-btn">
          Start daily vocabulary quiz
        </NuxtLink>
      </div>

      <QuizStartTips :primary-tips="primaryTips" :scoring-tips="scoringTips" />
    </section>
  </main>
</template>

<style scoped>
.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.quiz-intro-page {
  --pink: #eab8e4;
  --purple: #d6a3d1;
  --blue: #a8cae0;
  --yellow: #f4cd27;
  --blush: #f6e1e1;
}

.quiz-card {
  border-radius: 26px;
  padding: 2rem;
}

.start-btn {
  display: block;
  width: 100%;
  border-radius: 16px;
  padding: 0.75rem;
  font-weight: 600;
  text-align: center;
  background: #a8cae0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
  transform: translateY(-2px);
}


@media (max-width: 640px) {
  .quiz-card {
    padding: 1.5rem;
  }
}
</style>
