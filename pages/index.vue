<script setup lang="ts">
useSeoMeta({
  title: 'Learn Cantonese for everyday life',
  description: 'Learn natural Cantonese with vocabulary, sentence quizzes, audio-only drills, and writing practice.',
  ogTitle: 'Learn Cantonese for everyday life | TaroTea',
  ogDescription: 'Build everyday Cantonese with short, focused practice sessions.',
})

import { dayInMilliseconds, utcDayNumber, offlineWordForDay } from '~/utils/wordOfTheDay'
import {
  ArrowRight,
  CalendarCheck,
  CircleHelp,
  GraduationCap,
  Layers,
  PenLine,
  Tags,
  TrendingUp,
} from '@lucide/vue'

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

const { isLoggedIn, user, resolve: resolveMeState } = useMeStateV2()
const generalGreeting = ref('')
const momentumMessage = ref('')

const wordCardPalette = ['taro-blue', 'taro-pink', 'taro-yellow', 'success', 'taro-lilac']
const featuredDay = useState('home-featured-utc-day', () => utcDayNumber(Date.now()))
const { data: dailyFeature } = await useFetch('/api/word-of-the-day', {
  watch: [featuredDay],
  timeout: 5000,
  retry: 0,
})
const featuredWord = computed(() => {
  const feature = dailyFeature.value
  if (feature?.day === featuredDay.value) return feature.today
  if (feature && feature.day + 1 === featuredDay.value) return feature.tomorrow
  return offlineWordForDay(featuredDay.value)
})
const wordCardColour = computed(() => `rgb(var(--color-${wordCardPalette[featuredDay.value % wordCardPalette.length]}) / 0.4)`)
let midnightTimer: ReturnType<typeof setTimeout> | undefined

function syncFeaturedDay() {
  clearTimeout(midnightTimer)
  const now = Date.now()
  featuredDay.value = utcDayNumber(now)
  midnightTimer = setTimeout(syncFeaturedDay, dayInMilliseconds - (now % dayInMilliseconds))
}

const { dailyPracticeEnabled } = useRuntimeConfig().public
const primaryAction = computed(() => dailyPracticeEnabled && isLoggedIn.value
  ? { to: '/daily/vocab/start-quiz', label: 'Start daily practice' }
  : { to: '/levels', label: 'Start learning' })

const learningModes = [
  {
    title: 'Short, focused practice',
    description: 'Fit useful Cantonese practice into a busy day without pressure or noisy streak mechanics.',
    tone: 'yellow',
    icon: CalendarCheck,
  },
  {
    title: 'Different ways to learn',
    description: 'Move between vocabulary, listening, sentence and typing activities.',
    tone: 'blue',
    icon: Layers,
  },
  {
    title: 'Progress you can understand',
    description: 'Use XP, word familiarity and unlocks to see what is improving and what needs another look.',
    tone: 'pink',
    icon: TrendingUp,
  },
  {
    title: 'Traditional character writing',
    description: 'Follow stroke order and practise writing traditional Chinese characters at your own pace.',
    tone: 'sage',
    icon: PenLine,
  },
]

function formatGreeting(baseGreeting: string) {
  const firstName = user.value?.firstName?.trim()
  return firstName ? `${baseGreeting}, ${firstName}` : baseGreeting
}

function updateGeneralGreeting() {
  const hour = new Date().getHours()
  const greeting = hour < 5
    ? 'Burning the midnight oil'
    : hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : 'Good evening'

  generalGreeting.value = formatGreeting(greeting)
  momentumMessage.value = hour < 5
    ? 'A short late-night session can still keep your Cantonese moving.'
    : hour < 18
      ? 'Choose a short activity and keep your momentum going.'
      : 'Wind down with a quick Cantonese practice session.'
}

watch(() => user.value?.firstName, updateGeneralGreeting)

onMounted(() => {
  void resolveMeState()
  updateGeneralGreeting()
  syncFeaturedDay()
  document.addEventListener('visibilitychange', syncFeaturedDay)
})

onBeforeUnmount(() => {
  clearTimeout(midnightTimer)
  document.removeEventListener('visibilitychange', syncFeaturedDay)
})
</script>

<template>
  <AppPage size="wide" class="home-page">
    <section class="home-hero">
      <div class="home-hero-copy">
        <AppBadge tone="primary">Everyday Cantonese, made practical</AppBadge>
        <p v-if="isLoggedIn && generalGreeting" class="home-greeting">{{ generalGreeting }}</p>
        <h1>Build Cantonese you can actually use.</h1>
        <p class="home-intro">
          Learn natural vocabulary, listening and sentence patterns through short activities that fit around your day.
        </p>
        <p v-if="isLoggedIn && momentumMessage" class="home-momentum">{{ momentumMessage }}</p>
        <div class="home-actions">
          <AppButton :to="primaryAction.to" size="large">
            {{ primaryAction.label }}
            <template #trailing><ArrowRight /></template>
          </AppButton>
          <AppButton to="/topics" variant="secondary" size="large">Browse topics</AppButton>
        </div>
      </div>

      <div class="home-hero-panel" aria-label="TaroTea learner activity">
        <div class="home-word-sample" :style="{ backgroundColor: wordCardColour }">
          <div class="home-word-heading">
            <span class="home-word-label">Word of the day</span>
            <RecordingListenButton v-if="featuredWord.audioFile" :file="featuredWord.audioFile" featured />
          </div>
          <div class="home-word-content">
            <strong lang="zh-HK">{{ featuredWord.word }}</strong>
            <span class="home-jyutping">{{ featuredWord.jyutping }}</span>
            <span class="home-word-meaning">{{ featuredWord.meaning }}</span>
          </div>
        </div>
        <div class="home-stats bg-[#a8ace0]">
          <GraduationCap aria-hidden="true" /><strong>{{ stats?.totalUsers ?? '—' }}</strong><span>learners</span>
        </div>
      </div>
    </section>

    <AppSection title="Choose your learning path" description="Start with a structured level or learn the words that matter to you today.">
      <div class="home-path-grid">
        <AppCard tone="lilac" padding="generous" interactive>
          <span class="home-path-icon"><GraduationCap aria-hidden="true" /></span>
          <h3>Learn by level</h3>
          <p>Build a foundation step by step with grouped vocabulary and sentence patterns.</p>
          <AppButton to="/levels" variant="secondary">Explore levels</AppButton>
        </AppCard>
        <AppCard tone="blue" padding="generous" interactive>
          <span class="home-path-icon"><Tags aria-hidden="true" /></span>
          <h3>Learn by topic</h3>
          <p>Focus on travel, food, family and other situations from everyday conversation.</p>
          <AppButton to="/topics" class="home-explore-topics">Explore topics</AppButton>
        </AppCard>
      </div>
      <div class="home-practice-links">
        <NuxtLink to="/quiz"><CircleHelp aria-hidden="true" />Quiz practice</NuxtLink>
        <NuxtLink to="/typing-practice"><PenLine aria-hidden="true" />Typing practice</NuxtLink>
      </div>
    </AppSection>

    <AppSection title="Designed for steady progress">
      <div class="home-feature-grid">
        <article v-for="mode in learningModes" :key="mode.title" class="home-feature" :class="`home-feature-${mode.tone}`">
          <span><component :is="mode.icon" aria-hidden="true" /></span>
          <div><h3>{{ mode.title }}</h3><p>{{ mode.description }}</p></div>
        </article>
      </div>
    </AppSection>
  </AppPage>
</template>

<style scoped>
.home-page { padding-top: clamp(2.5rem, 7vw, 6rem); }
.home-hero { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(19rem, 0.9fr); align-items: center; gap: clamp(2rem, 7vw, 6rem); margin-bottom: clamp(4.5rem, 10vw, 8rem); }
.home-hero-copy { max-width: 42rem; }
.home-greeting { margin: 1.4rem 0 -0.65rem; color: rgb(var(--color-primary-strong)); font-weight: 700; }
.home-hero h1 { max-width: 12ch; margin: 1.1rem 0 0; font-size: clamp(2.7rem, 7vw, 5.25rem); font-weight: 700; letter-spacing: -0.065em; line-height: 0.98; text-wrap: balance; }
.home-intro { max-width: 38rem; margin: 1.5rem 0 0; color: rgb(var(--color-muted)); font-size: clamp(1.05rem, 2vw, 1.25rem); line-height: 1.65; }
.home-momentum { margin: 0.75rem 0 0; color: rgb(var(--color-primary-strong)); font-size: 0.9rem; }
.home-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.8rem; }
.home-hero-panel { overflow: hidden; border: 1px solid rgb(var(--color-ink) / 0.09); border-radius: var(--radius-panel); background: rgb(var(--color-surface)); box-shadow: var(--shadow-soft); }
.home-word-sample { display: flex; min-height: 20rem; flex-direction: column; padding: 1rem; }
.home-word-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.home-word-heading :deep(button) { min-height: 2.75rem; background: transparent; color: #000; border: 0; box-shadow: none; }
.home-word-heading :deep(button:hover) { text-decoration: underline; }
.home-word-heading :deep(button:focus-visible) { outline: 2px solid currentColor; outline-offset: 2px; }
.home-word-content { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 clamp(1rem, 4vw, 3rem) 1rem; }
.home-word-label { color: rgb(var(--color-primary-strong)); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.home-word-sample strong { margin-top: 1rem; font-family: var(--font-chinese); font-size: clamp(3rem, 8vw, 5rem); line-height: 1.05; }
.home-jyutping { margin-top: 0.8rem; color: rgb(var(--color-primary-strong)); font-weight: 700; }
.home-word-meaning { margin-top: 0.25rem; color: rgb(var(--color-ink)); }
.home-stats { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0.1rem 0.6rem; padding: 1rem 1.2rem; border-top: 1px solid rgb(var(--color-ink) / 0.09); }
.home-stats svg { grid-row: 1 / 3; width: 1.2rem; color: rgb(var(--color-primary-strong)); }
.home-stats strong { line-height: 1; }
.home-stats span { color: rgb(var(--color-ink)); font-size: 0.72rem; }
.home-path-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.home-explore-topics {
  --color-primary: 52 99 133;
  --color-primary-strong: 37 75 104;
}
.home-path-grid h3 { margin: 1.2rem 0 0; font-size: 1.35rem; }
.home-path-grid p { min-height: 3.2rem; margin: 0.55rem 0 1.4rem; color: rgb(var(--color-muted)); line-height: 1.6; }
.home-path-icon { display: inline-flex; width: 2.8rem; height: 2.8rem; align-items: center; justify-content: center; border-radius: var(--radius-control); background: rgb(var(--color-surface) / 0.7); color: rgb(var(--color-primary-strong)); }
.home-path-icon svg { width: 1.4rem; }
.home-practice-links { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; }
.home-practice-links a { display: inline-flex; min-height: 2.75rem; align-items: center; gap: 0.5rem; border-radius: var(--radius-control); padding: 0.65rem 0.85rem; color: rgb(var(--color-primary-strong)); font-weight: 700; text-decoration: none; }
.home-practice-links a:hover { background: rgb(var(--color-taro-pink) / 0.2); }
.home-practice-links svg { width: 1.1rem; }
.home-feature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.home-feature { display: flex; gap: 1rem; border: 1px solid rgb(var(--color-ink) / 0.08); border-radius: var(--radius-card); padding: 1.3rem; background: rgb(var(--color-surface)); }
.home-feature > span { display: inline-flex; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 0.75rem; color: rgb(var(--color-primary-strong)); }
.home-feature svg { width: 1.25rem; }
.home-feature-yellow > span { background: rgb(var(--color-taro-yellow) / 0.22); }
.home-feature-blue > span { background: rgb(var(--color-taro-blue) / 0.35); }
.home-feature-pink > span { background: rgb(var(--color-taro-pink) / 0.35); }
.home-feature-sage > span { background: rgb(var(--color-success) / 0.18); }
.home-feature h3 { margin: 0; font-size: 1rem; }
.home-feature p { margin: 0.35rem 0 0; color: rgb(var(--color-muted)); font-size: 0.875rem; line-height: 1.55; }
@media (max-width: 767px) { .home-hero { grid-template-columns: 1fr; } .home-hero-panel { max-width: 34rem; } .home-word-sample { min-height: 15rem; } }
@media (max-width: 559px) { .home-actions > :deep(*) { width: 100%; } .home-path-grid, .home-feature-grid { grid-template-columns: 1fr; } .home-path-grid p { min-height: 0; } }
</style>
