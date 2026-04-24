<script setup lang="ts">
const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

const benefits = [
  'Build practical Cantonese vocabulary in just 15 minutes a day.',
  'Play multiple activity modes to learn words, pronunciation, and listening.',
  'Track your progress with bite-sized sessions you can keep up with.',
]

const learningModes = [
  {
    title: 'Daily practice',
    description: 'Short sessions designed for consistency, even with a busy schedule.',
  },
  {
    title: 'Multiple activities',
    description: 'Switch between vocabulary, quiz, and pronunciation-focused learning modes.',
  },
  {
    title: 'Progress-driven',
    description: 'See your growth and keep momentum with clear goals and repetition.',
  },
]

const currentUsers = ref<number | null>(null)
const sessionCookie = useCookie<string>('online_session_id', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

async function refreshCurrentUsers() {
  if (!sessionCookie.value && import.meta.client) {
    sessionCookie.value = crypto.randomUUID()
  }

  const data = await $fetch<{ currentUsers: number }>('/api/current-users', {
    method: 'POST',
    body: {
      sessionId: sessionCookie.value,
    },
  })

  currentUsers.value = data.currentUsers
}

onMounted(() => {
  void refreshCurrentUsers()
  const interval = setInterval(() => {
    void refreshCurrentUsers()
  }, 30_000)

  onBeforeUnmount(() => {
    clearInterval(interval)
  })
})

</script>

<template>
  <main class="max-w-3xl mx-auto py-20 px-6 min-h-screen">
    <section class="text-center">
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
        Learn and improve your Cantonese vocabulary in just 15 minutes a day
      </h1>

      <p class="text-base sm:text-lg text-gray-700 mt-4 max-w-2xl mx-auto">
        Build confidence with short, focused practice and fun activities that help you remember what you learn.
      </p>

      <ul class="mt-8 space-y-3 text-left max-w-2xl mx-auto">
        <li
          v-for="benefit in benefits"
          :key="benefit"
          class="rounded-lg px-4 py-3 bg-white border border-gray-100 shadow-sm text-gray-700"
        >
          {{ benefit }}
        </li>
      </ul>
    </section>

    <section class="mt-12">
      <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
        How you learn
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <article
          v-for="mode in learningModes"
          :key="mode.title"
          class="rounded-lg border border-gray-100 bg-white p-5 shadow-sm"
        >
          <h3 class="font-semibold text-gray-900">
            {{ mode.title }}
          </h3>
          <p class="text-sm text-gray-700 mt-2">
            {{ mode.description }}
          </p>
        </article>
      </div>
    </section>

    <section class="mt-10 rounded-xl p-6 sm:p-8 bg-slate-900 text-white">
      <h2 class="text-2xl font-semibold tracking-tight">
        Start learning Cantonese today
      </h2>
      <p class="text-sm sm:text-base text-slate-200 mt-2">
        Play through different modes and build real vocabulary you can use in everyday conversations.
      </p>
      <div class="mt-5 flex flex-wrap gap-3">
        <NuxtLink
          to="/topics"
          class="inline-flex items-center justify-center rounded-md bg-white text-slate-900 font-medium px-4 py-2 hover:bg-slate-100 transition"
        >
          Explore topics
        </NuxtLink>
        <NuxtLink
          to="/quiz"
          class="inline-flex items-center justify-center rounded-md border border-slate-300 text-white font-medium px-4 py-2 hover:bg-slate-800 transition"
        >
          Try quizzes
        </NuxtLink>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="text-sm uppercase tracking-wide text-gray-500 mt-6 mb-4">
        Community stats
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div class="rounded-lg p-6 text-center" style="background-color:#E7F3D5; border-color:#E7F3D5;">
          <div class="text-2xl font-semibold text-gray-900">
            {{ currentUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Current users online
          </div>
        </div>

        <div class="rounded-lg p-6 text-center" style="background-color:#F6E1E1; border-color:#F6E1E1;">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats?.totalUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.topic-btn-blush {
  background: rgb(249, 166, 166);
}

.topic-btn-blush:hover {
  background: rgb(204, 136, 136);
}
</style>
