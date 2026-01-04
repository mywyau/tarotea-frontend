<script setup>

// import Button from '~/components/Button.vue';

</script>

<template>
  <header class="border-b bg-white shadow-sm py-3">
    <div class="max-w-5xl mx-auto flex justify-between items-center px-4">
      <NuxtLink to="/" class="text-2xl font-bold text-primary-600">
        TaroTea
      </NuxtLink>

      <div>
        <!-- <Button variant="primary" v-if="!isAuthenticated" @click="login">
          Login
        </Button> -->

        <div class="flex items-center gap-4">

          <NuxtLink to="/topics" class="text-l text-primary-600">
            Topics
          </NuxtLink>

          <NuxtLink to="/levels" class="text-l text-primary-600">
            Levels
          </NuxtLink>

          <!-- <NuxtLink to="/modules" class="text-l text-primary-600">
            Modules
          </NuxtLink> -->

          <span class="text-gray-700">{{ user?.name }}</span>
          <!-- 
          <Button variant="danger" @click="logout">
            Logout
          </Button> -->
        </div>

      </div>
    </div>
  </header>
</template>
