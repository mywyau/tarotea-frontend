<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const { isLoggedIn, resolve } = useMeStateV2()

const menuOpen = ref(false)
const navOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

function toggleNav() {
  navOpen.value = !navOpen.value
}
function closeNav() {
  navOpen.value = false
}

async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closeMenu()
}

function onDocumentClick(e: MouseEvent) {
  if (!menuOpen.value) return
  const target = e.target as Node | null
  if (menuRoot.value && target && !menuRoot.value.contains(target)) {
    closeMenu()
  }
}

onMounted(() => {
  resolve({ force: true })
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header class="header-shell sticky top-0 z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="nav-trigger"
          @click="toggleNav"
          aria-label="Open navigation panel"
          :aria-expanded="navOpen ? 'true' : 'false'"
        >
          Navigate
        </button>

        <NuxtLink to="/" class="text-2xl font-bold text-black hover:text-gray-700">
          TaroTea
        </NuxtLink>
      </div>

      <div ref="menuRoot" class="relative">
        <button type="button" class="menu-btn" @click.stop="toggleMenu" aria-label="Open account menu"
          :aria-expanded="menuOpen ? 'true' : 'false'">
          ☰
        </button>

        <div v-if="menuOpen" class="menu-panel">
          <template v-if="isLoggedIn">
            <NuxtLink to="/account/v2"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-black hover:bg-black/5 transition"
              @click="closeMenu">
              Account
            </NuxtLink>

            <NuxtLink to="/stats/v2"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-black hover:bg-black/5 transition"
              @click="closeMenu">
              Stats
            </NuxtLink>

            <NuxtLink to="/upgrade"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm font-semibold hover:bg-black hover:brightness-125 transition"
              @click="closeMenu">

              <span
                class="bg-gradient-to-r from-[#d48fd0] via-[#b57bc3] via-[#6faed6] to-[#d48fd0] bg-clip-text text-transparent">
                Upgrade
              </span>
            </NuxtLink>

            <div class="h-px my-2 bg-black/10"></div>

            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-red-700 hover:bg-red-500/10 transition"
              @click="handleLogout">
              Log out
            </button>
          </template>

          <template v-else>
            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-black/5 transition"
              @click="login()">
              Login
            </button>
          </template>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="navOpen" class="drawer-overlay" @click="closeNav" />
    </transition>

    <transition name="slide-left">
      <aside v-if="navOpen" class="nav-drawer" aria-label="Main navigation panel">
        <div class="flex items-center justify-between px-4 py-4 border-b border-black/10">
          <span class="font-semibold">Navigate</span>
          <button type="button" class="text-xl" aria-label="Close navigation panel" @click="closeNav">×</button>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <NuxtLink v-if="isLoggedIn" to="/daily/v3" class="drawer-link" @click="closeNav">Daily</NuxtLink>
          <NuxtLink to="/topics" class="drawer-link" @click="closeNav">Topics</NuxtLink>
          <NuxtLink to="/topics/quiz" class="drawer-link" @click="closeNav">Topic Quiz</NuxtLink>
          <NuxtLink to="/levels" class="drawer-link" @click="closeNav">Levels</NuxtLink>
          <NuxtLink to="/quiz" class="drawer-link" @click="closeNav">Level Quiz</NuxtLink>
        </nav>
      </aside>
    </transition>
  </header>
</template>

<style scoped>
.header-shell {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  font-size: 26px;
}

.menu-btn:active {
  transform: scale(0.98);
}


.nav-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.25rem;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  padding: 0.35rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #111827;
  background: rgba(255, 255, 255, 0.78);
  transition: background 120ms ease, border-color 120ms ease;
}

.nav-trigger:hover {
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(0, 0, 0, 0.28);
}

.menu-panel {
  position: absolute;
  right: 0;
  margin-top: 10px;
  width: 220px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  padding: 10px;
  z-index: 60;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.3);
}

.nav-drawer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  height: 100vh;
  width: min(20rem, 88vw);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.18);
}

.drawer-link {
  display: flex;
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  color: #111827;
  transition: background 120ms ease;
}

.drawer-link:hover {
  background: rgba(0, 0, 0, 0.06);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.22s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
