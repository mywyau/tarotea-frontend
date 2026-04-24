<script setup lang="ts">
const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

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
    <!-- Hero Section -->
    <div class="text-center">

      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
        Learn and practice Cantonese
      </h1>
    </div>

    <!-- Stats -->
    <div class="">

      <h2 class="text-sm uppercase tracking-wide text-gray-500 mt-6 mb-4">
        Site stats
      </h2>

      <!-- <div class="grid grid-cols-1 sm:grid-cols-2 gap-5"> -->
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
            <!-- {{ stats?.paidUsers ?? '—' }} -->
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>
      </div>
    </div>
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
