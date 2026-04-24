<template>
  <header ref="panelRoot" class="header-shell sticky top-0 z-50">
    <div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
      <NuxtLink to="/" class="text-2xl font-semibold tracking-tight text-black hover:text-black/70">
        TaroTea
      </NuxtLink>

      <div class="relative">
        <button
          type="button"
          class="menu-btn text-black"
          aria-label="Open navigation menu"
          :aria-expanded="panelOpen ? 'true' : 'false'"
          @click.stop="togglePanel"
        >
          ☰
        </button>

        <transition name="fade">
          <div v-if="panelOpen" class="menu-panel">
            <template v-if="isLoggedIn">
              <NuxtLink
                to="/account/v2"
                class="menu-item"
                @click="closePanel"
              >
                Account
              </NuxtLink>

              <NuxtLink
                to="/stats/v2"
                class="menu-item"
                @click="closePanel"
              >
                Stats
              </NuxtLink>

              <NuxtLink
                v-if="showUpgrade"
                to="/upgrade"
                class="menu-item menu-upgrade"
                @click="closePanel"
              >
                Upgrade
              </NuxtLink>

              <div class="menu-sep" />

              <button
                type="button"
                class="menu-item menu-danger"
                @click="handleLogout"
              >
                Log out
              </button>
            </template>

            <button
              v-else
              type="button"
              class="menu-item"
              @click="login()"
            >
              Login
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>