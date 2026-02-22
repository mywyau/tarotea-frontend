<script setup lang="ts">
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const { isLoggedIn, entitlement, resolve } = useMeStateV2()

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

const showUpgrade = computed(() => {
  return (
    entitlement.value?.plan === 'free' ||
    entitlement.value?.subscription_status !== 'active'
  )
})

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
  <header class="header-shell">
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="text-2xl font-bold text-gray-900 hover:opacity-80">
        TaroTea
      </NuxtLink>

      <div ref="menuRoot" class="relative">
        <button type="button" class="menu-btn" @click.stop="toggleMenu" aria-label="Open account menu"
          :aria-expanded="menuOpen ? 'true' : 'false'">
          ☰
        </button>

        <div v-if="menuOpen" class="menu-panel">
          <!-- Logged in -->
          <template v-if="isLoggedIn">
            <NuxtLink to="/account"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-black/5 transition"
              @click="closeMenu">
              Account
            </NuxtLink>

            <NuxtLink to="/stats"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-black/5 transition"
              @click="closeMenu">
              Stats
            </NuxtLink>

            <NuxtLink to="/upgrade" class="w-full flex items-center rounded-xl px-3 py-2 text-sm font-semibold
         hover:bg-black/5 transition" @click="closeMenu">
              <span class="bg-gradient-to-r
           from-[#d48fd0]
           via-[#b57bc3]
           via-[#6faed6]
           to-[#d48fd0]
           bg-clip-text text-transparent
           hover:brightness-125 transition">
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

          <!-- Logged out -->
          <template v-else>
            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-black/5 transition"
              @click="loginWithGoogle">
              Login
            </button>

            <NuxtLink to="/upgrade" class="w-full flex items-center rounded-xl px-3 py-2 text-sm font-semibold
         hover:bg-black/5 transition" @click="closeMenu">
              <span class="bg-gradient-to-r
           from-[#d48fd0]
           via-[#b57bc3]
           via-[#6faed6]
           to-[#d48fd0]
           bg-clip-text text-transparent
           hover:brightness-125 transition">
                Upgrade
              </span>
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* palette */
.header-shell {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  /* let your app background show through */
  /* background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(214, 163, 209, 0.35); */
}

/* hamburger button */
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  font-size: 26px;
  /* bigger ☰ */
  /* border-radius: 12px; */
  /* border: 1px solid rgba(214, 163, 209, 0.55); */
  /* background: rgba(255, 255, 255, 0.7); */
  /* transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease; */
}

/* .menu-btn:hover {
  background: rgba(246, 225, 225, 0.55);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
} */

.menu-btn:active {
  transform: scale(0.98);
}

/* dropdown panel */
.menu-panel {
  position: absolute;
  right: 0;
  margin-top: 10px;
  width: 220px;
  border-radius: 10px;
  /* border: 1px solid rgba(214, 163, 209, 0.45); */
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  padding: 10px;
  z-index: 50;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px 10px;
  border-radius: 12px;
  font-size: 14px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}

/* .menu-item:hover {
  background: rgba(168, 202, 224, 0.25);
} */

.menu-sep {
  height: 1px;
  margin: 10px 6px;
  background: rgba(0, 0, 0, 0.08);
}

.menu-upgrade {
  font-weight: 700;
  /* background: rgba(244, 205, 39, 0.35); */
}

/* .menu-upgrade:hover {
  background: rgba(244, 205, 39, 0.5);
} */

.menu-danger {
  color: #b91c1c;
}

.menu-danger:hover {
  background: rgba(234, 184, 228, 0.35);
}
</style>