<script setup lang="ts">
const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

const { isLoggedIn } = useMeStateV2()

const productPillars = [
  {
    title: 'Daily consistency',
    body: 'Build momentum with daily vocab + daily jyutping drills.',
    cta: 'Start daily',
    to: '/daily/vocab/v2',
    tone: 'blush',
  },
  {
    title: 'Structured growth',
    body: 'Progress through levels and topics with guided practice paths.',
    cta: 'Explore levels',
    to: '/levels',
    tone: 'blue',
  },
  {
    title: 'Performance feedback',
    body: 'Track XP, streaks, and weakest words to improve faster.',
    cta: 'Take a quiz',
    to: '/quiz',
    tone: 'purple',
  },
]

const howItWorks = [
  {
    title: 'Pick your lane',
    body: 'Choose Daily, Levels, or Topics based on your time and goal.',
  },
  {
    title: 'Practice in short bursts',
    body: 'Use vocabulary, audio, and sentence quizzes for real retention.',
  },
  {
    title: 'Measure progress',
    body: 'See streaks and stats so you always know what to study next.',
  },
]
</script>

<template>
  <main class="home-v2 max-w-5xl mx-auto px-6 py-12 space-y-14">
    <section class="hero-card rounded-3xl p-8 sm:p-10">
      <p class="eyebrow">Modern Cantonese Learning</p>

      <h1 class="hero-title mt-3">
        Speak practical Cantonese in
        <span class="hero-accent">10 minutes a day</span>.
      </h1>

      <p class="hero-sub mt-4 max-w-2xl">
        Daily drills, sentence quizzes, and audio-first practice designed for real-world progress.
      </p>

      <div class="mt-7 flex flex-col sm:flex-row gap-3">
        <NuxtLink to="/daily/vocab/v2" class="btn-primary">Start free</NuxtLink>
        <NuxtLink to="/topics" class="btn-secondary">See how it works</NuxtLink>
      </div>

      <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="stat-chip">
          <p class="stat-value">{{ stats?.totalUsers ?? '—' }}</p>
          <p class="stat-label">Learners</p>
        </div>

        <div class="stat-chip">
          <p class="stat-value">Daily</p>
          <p class="stat-label">New drills available</p>
        </div>

        <div class="stat-chip">
          <p class="stat-value">Audio + Text</p>
          <p class="stat-label">Multiple training modes</p>
        </div>
      </div>
    </section>

    <section v-if="isLoggedIn" class="rounded-2xl p-6 quick-lane">
      <h2 class="section-title">Continue where you left off</h2>
      <p class="section-sub">Jump straight back into practice.</p>

      <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NuxtLink to="/daily/vocab/v2" class="tile tile-soft">Resume Daily</NuxtLink>
        <NuxtLink to="/quiz" class="tile tile-soft">Run a Quiz</NuxtLink>
        <NuxtLink to="/topics/quiz" class="tile tile-soft">Practice by Topic</NuxtLink>
      </div>
    </section>

    <section>
      <h2 class="section-title">Why TaroTea works</h2>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <article v-for="item in productPillars" :key="item.title" class="pillar" :class="`pillar-${item.tone}`">
          <h3 class="pillar-title">{{ item.title }}</h3>
          <p class="pillar-body">{{ item.body }}</p>
          <NuxtLink :to="item.to" class="pillar-cta">{{ item.cta }} →</NuxtLink>
        </article>
      </div>
    </section>

    <section>
      <h2 class="section-title">How it works</h2>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <article v-for="(step, index) in howItWorks" :key="step.title" class="how-card">
          <p class="step-index">Step {{ index + 1 }}</p>
          <h3 class="pillar-title mt-2">{{ step.title }}</h3>
          <p class="pillar-body">{{ step.body }}</p>
        </article>
      </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <NuxtLink to="/topics/quiz" class="tile tile-yellow">
        <h3 class="tile-title">Practice by topic</h3>
        <p class="tile-desc">Target real-life themes with vocab, audio, and sentence quizzes.</p>
      </NuxtLink>

      <NuxtLink to="/dojo" class="tile tile-blue">
        <h3 class="tile-title">Train your typing</h3>
        <p class="tile-desc">Build speed and accuracy with focused dojo exercises.</p>
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.home-v2 {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

.hero-card {
  background: linear-gradient(140deg, rgba(234, 184, 228, 0.38), rgba(168, 202, 224, 0.36));
  border: 1px solid rgba(17, 24, 39, 0.07);
}

.eyebrow {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(17, 24, 39, 0.72);
}

.hero-title {
  font-size: clamp(1.9rem, 5vw, 3rem);
  line-height: 1.15;
  font-weight: 700;
  color: #0f172a;
}

.hero-accent { color: #6b21a8; }
.hero-sub { color: rgba(15, 23, 42, 0.82); font-size: 1rem; }

.btn-primary,
.btn-secondary {
  border-radius: 14px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  text-align: center;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.btn-primary { background: #111827; color: white; }
.btn-secondary { background: rgba(255, 255, 255, 0.72); color: #111827; border: 1px solid rgba(17,24,39,0.1); }

.btn-primary:hover,
.btn-secondary:hover { transform: translateY(-1px); filter: brightness(1.04); }

.stat-chip {
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(17, 24, 39, 0.07);
  border-radius: 14px;
  padding: 0.8rem 0.9rem;
}

.stat-value { font-weight: 700; font-size: 1rem; color: #111827; }
.stat-label { font-size: 0.8rem; color: rgba(17, 24, 39, 0.72); }

.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
}

.section-sub { font-size: 0.9rem; color: rgba(17, 24, 39, 0.72); }

.quick-lane {
  background: rgba(214, 163, 209, 0.2);
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.pillar,
.how-card,
.tile {
  border-radius: 18px;
  padding: 1rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.pillar:hover,
.tile:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,0.07); }

.pillar-blue { background: rgba(168, 202, 224, 0.42); }
.pillar-purple { background: rgba(214, 163, 209, 0.36); }
.pillar-blush { background: rgba(246, 225, 225, 0.8); }

.pillar-title { font-size: 1rem; font-weight: 700; color: #111827; }
.pillar-body { margin-top: 0.35rem; font-size: 0.88rem; color: rgba(17, 24, 39, 0.78); }
.pillar-cta { margin-top: 0.7rem; display: inline-block; font-weight: 600; font-size: 0.88rem; color: #111827; }

.how-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.step-index {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(17, 24, 39, 0.6);
}

.tile-soft { background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(17,24,39,0.08); }
.tile-yellow { background: rgba(244, 205, 39, 0.35); }
.tile-blue { background: rgba(168, 202, 224, 0.45); }

.tile-title { font-size: 1rem; font-weight: 700; color: #111827; }
.tile-desc { margin-top: 0.35rem; font-size: 0.86rem; color: rgba(17,24,39,0.8); }
</style>
