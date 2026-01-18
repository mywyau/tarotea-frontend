<script setup lang="ts">

// import Button from '~/components/Button.vue';
import { logout } from '@/composables/useAuth'
import { useUpgrade } from '@/composables/useUpgrade'


const me = await useMe()
const authReady = computed(() => me !== undefined)


const isClient = ref(false)

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

function handleLogout() {
  logout()
}

onMounted(() => {
  isClient.value = true
})

</script>


<template>
  <header class="border-b bg-white shadow-sm py-3">

    <div class="max-w-5xl mx-auto flex justify-between items-center px-4">

      <NuxtLink to="/" class="text-2xl font-bold text-primary-600">
        TaroTea
      </NuxtLink>

      <div>

        <!-- <button @click="loginWithEmail">
          Continue with email
        </button> -->


        <div class="flex items-center gap-4">

          <!-- <NuxtLink to="/topics" class="text-l text-primary-600">
            Topics
          </NuxtLink> -->

          <NuxtLink to="/levels" class="text-l text-primary-600">
            Levels
          </NuxtLink>

          <!-- <NuxtLink to="/modules" class="text-l text-primary-600">
            Modules
          </NuxtLink> -->

          <button v-if="me && me.plan !== 'pro'" class="text-sm px-3 py-1 rounded bg-green-600 text-white"
            @click="upgrade('monthly')">
            Upgrade
          </button>


          <button v-if="isClient" @click="loginWithGoogle">
            Login
          </button>

          <span class="text-gray-700">{{ user?.name }}</span>

          <!-- <button @click="logout">Log out</button> -->

          <button v-if="authReady && me" class="text-sm text-red-600 hover:underline" @click="handleLogout">
            Log out
          </button>

        </div>

      </div>
    </div>
  </header>
</template>
