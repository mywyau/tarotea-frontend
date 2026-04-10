<script setup lang="ts">
definePageMeta({
  ssr: false
})

type UserStats = {
  total_xp: number | string
  words_maxed: number | string
  words_seen: number | string
  words_unlocked: number | string
  total_correct: number | string
  total_wrong: number | string
  xp_this_week: number | string
}

type StatCard = {
  label: string
  value: number
  suffix?: string
  signed?: boolean
}

const statsData = ref<UserStats | null>(null)
const loading = ref(true)
const errorState = ref<string | null>(null)
const animatedStats = ref<number[]>([])

function toNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const stats = computed<StatCard[]>(() => {
  if (!statsData.value) return []

  return [
    {
      label: 'Total XP',
      value: toNumber(statsData.value.total_xp),
      suffix: 'xp'
    },
    {
      label: 'XP Last 7 Days',
      value: toNumber(statsData.value.xp_this_week),
      suffix: 'xp',
      signed: true
    },
    {
      label: 'Words Unlocked',
      value: toNumber(statsData.value.words_unlocked)
    },
    {
      label: 'Words Seen',
      value: toNumber(statsData.value.words_seen)
    },
    {
      label: 'Words Maxed',
      value: toNumber(statsData.value.words_maxed)
    },
    {
      label: 'Correct Answers',
      value: toNumber(statsData.value.total_correct)
    },

  ]
})

function animateStats(targets: number[], duration = 1200) {
  const start = performance.now()
  const from = targets.map(() => 0)

  function step(now: number) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 4)

    animatedStats.value = targets.map((target, index) =>
      Math.round(from[index] + (target - from[index]) * eased)
    )

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      animatedStats.value = [...targets]
    }
  }

  requestAnimationFrame(step)
}

function formatStatValue(stat: StatCard, index: number): string {
  const rawValue = animatedStats.value[index] ?? stat.value
  const suffix = stat.suffix ? ` ${stat.suffix}` : ''

  if (stat.signed) {
    if (rawValue > 0) {
      return `+${Math.abs(rawValue).toLocaleString()}${suffix}`
    }

    if (rawValue < 0) {
      return `-${Math.abs(rawValue).toLocaleString()}${suffix}`
    }

    return `0${suffix}`
  }

  return `${rawValue.toLocaleString()}${suffix}`
}

onMounted(async () => {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const res = await $fetch<UserStats>('/api/user/stats/v2', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    statsData.value = res
    animatedStats.value = stats.value.map(() => 0)

    await nextTick()

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || stats.value.length === 0) {
      animatedStats.value = stats.value.map(stat => stat.value)
    } else {
      animateStats(stats.value.map(stat => stat.value))
    }
  } catch (err) {
    console.error('Stats fetch failed', err)
    errorState.value = 'Failed to load stats.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="max-w-4xl mx-auto px-4 py-16 space-y-12">
    <BackLink />

    <div v-if="loading" class="text-center text-gray-400">
      Loading stats...
    </div>

    <div v-else-if="errorState" class="text-center text-red-500">
      {{ errorState }}
    </div>

    <div v-else>
      <h1 class="your-stat-heading">
        Your Stats
      </h1>

      <transition-group name="card-fade" tag="div"
        class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
        <div v-for="(stat, index) in stats" :key="stat.label" class="stat-card hover:brightness-110"
          :class="`stat-${index}`">
          <p class="stat-label">
            {{ stat.label }}
          </p>

          <p class="stat-value">
            {{ formatStatValue(stat, index) }}
          </p>
        </div>
      </transition-group>
    </div>
  </main>
</template>

<style scoped>
.card-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

main {
  border-radius: 24px;
}

.stat-card {
  border-radius: 22px;
  padding: 1.5rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.your-stat-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 700;
  margin-top: 0.75rem;
  color: #111827;
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

.stat-3 {
  background: rgba(246, 225, 225, 0.75);
}

.stat-4 {
  background: rgba(122, 111, 203, 0.4);
}

.stat-5 {
  background: rgba(130, 255, 111, 0.4);
}
</style>