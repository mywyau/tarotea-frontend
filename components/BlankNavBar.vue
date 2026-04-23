<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const route = useRoute()
const { isLoggedIn, entitlement, resolve } = useMeStateV2()

const panelOpen = ref(false)
const panelRoot = ref<HTMLElement | null>(null)

const primaryLinks = computed(() => [
  ...(isLoggedIn.value ? [{ to: '/daily/vocab/v2', label: 'Daily' }] : []),
  { to: '/dojo', label: 'Dojo' },
  { to: '/levels', label: 'Levels' },
  { to: '/quiz', label: 'Level Quiz' },
  { to: '/topics', label: 'Topics' },
  { to: '/topics/quiz', label: 'Topic Quiz' },
])

const accountLinks = computed(() => [
  { to: '/account/v2', label: 'Account' },
  { to: '/stats/v2', label: 'Stats' },
])

const showUpgrade = computed(() => isLoggedIn.value
  && (entitlement.value?.plan === 'free' || entitlement.value?.subscription_status !== 'active'))

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function closePanel() {
  panelOpen.value = false
}

async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closePanel()
}

function onDocumentClick(e: MouseEvent) {
  if (!panelOpen.value) return

  const target = e.target as Node | null
  if (panelRoot.value && target && !panelRoot.value.contains(target)) {
    closePanel()
  }
}

watch(() => route.fullPath, () => {
  closePanel()
})

onMounted(() => {
  resolve({ force: true })
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header ref="panelRoot" class="sticky top-0 z-50 backdrop-blur">
    <div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between border-b border-black/10 bg-white/80 px-4">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-black transition"
          :class="panelOpen ? 'bg-black text-white shadow-lg shadow-black/20' : 'hover:bg-black/5'"
          :aria-label="panelOpen ? 'Close navigation panel' : 'Open navigation panel'"
          :aria-expanded="panelOpen ? 'true' : 'false'"
          @click.stop="togglePanel">
          {{ panelOpen ? '✕' : '☰' }}
        </button>

        <NuxtLink to="/" class="text-2xl font-semibold tracking-tight text-black hover:text-black/70">
          TaroTea
        </NuxtLink>
      </div>
    </div>

    <transition name="fade">
      <div v-if="panelOpen" class="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" aria-hidden="true"
        @click="closePanel" />
    </transition>

    <aside
      class="fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-80 max-w-[84vw] border-r border-black/10 bg-white/95 shadow-xl transition-transform duration-200"
      :class="panelOpen ? 'translate-x-0' : '-translate-x-full'" aria-label="Site navigation">
      <nav class="space-y-6 overflow-y-auto px-4 py-5">
        <section>
          <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-black/45">
            Learn
          </p>
          <div class="space-y-1">
            <NuxtLink v-for="link in primaryLinks" :key="link.to" :to="link.to"
              class="block rounded-lg px-3 py-2 text-sm text-black transition hover:bg-black/5" @click="closePanel">
              {{ link.label }}
            </NuxtLink>
          </div>
        </section>

        <section>
          <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-black/45">
            Account
          </p>

          <div class="space-y-1">
            <template v-if="isLoggedIn">
              <NuxtLink v-for="link in accountLinks" :key="link.to" :to="link.to"
                class="block rounded-lg px-3 py-2 text-sm text-black transition hover:bg-black/5" @click="closePanel">
                {{ link.label }}
              </NuxtLink>

              <NuxtLink v-if="showUpgrade" to="/upgrade"
                class="block rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text px-3 py-2 text-sm font-semibold text-transparent transition hover:brightness-90"
                @click="closePanel">
                Upgrade
              </NuxtLink>

              <button type="button"
                class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-500/10"
                @click="handleLogout">
                Log out
              </button>
            </template>

            <button v-else type="button"
              class="block w-full rounded-lg px-3 py-2 text-left text-sm text-blue-700 transition hover:bg-blue-500/10"
              @click="login()">
              Login
            </button>
          </div>
        </section>
      </nav>
    </aside>
  </header>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
