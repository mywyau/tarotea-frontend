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
            Words
          </NuxtLink>

          <NuxtLink to="/modules" class="text-l text-primary-600">
            Modules
          </NuxtLink>

          <!-- <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 1
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 2
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 3
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 4
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 6
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 7
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 8
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 9
          </NuxtLink>

          <NuxtLink to="/words/level-one" class="text-l text-primary-600">
            Level 10
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
