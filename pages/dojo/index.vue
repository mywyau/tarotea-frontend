<script setup lang="ts">

definePageMeta({
  ssr: true
})

</script>

<template>
  <main class="max-w-3xl mx-auto py-20 px-6 space-y-10">

    <BackLink />

    <!-- Header -->
    <div class="text-center space-y-4">
      <h1 class="text-3xl sm:text-4xl font-semibold text-black dojo-heading">
        Jyutping Dojo
      </h1>

      <p class="text-gray-700 max-w-lg mx-auto dojo-subheading">
        Strengthen your Cantonese phonetic skills with some training.
      </p>
    </div>

    <!-- Training Options -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">

      <!-- Level Training -->
      <NuxtLink to="/dojo/level" class="rounded-2xl p-8 shadow-sm hover:shadow-md transition
               hover:-translate-y-1 active:scale-[0.99]" style="background-color:#A8CAE0;">
        <div class="space-y-3">
          <div class="text-xl font-semibold text-black">
            Level Training
          </div>
          <p class="text-sm text-gray-900/80">
            Practice by structured progression levels.
          </p>
        </div>
      </NuxtLink>

      <!-- Topic Training -->
      <NuxtLink to="/dojo/topic" class="rounded-2xl p-8 shadow-sm hover:shadow-md transition
               hover:-translate-y-1 active:scale-[0.99]" style="background-color:#EAB8E4;">
        <div class=" space-y-3">
          <div class="text-xl font-semibold text-black">
            Topic Training
          </div>
          <p class="text-sm text-gray-900/80">
            Train your phonetics by subject area.
          </p>
        </div>
      </NuxtLink>
    </div>

  </main>
</template>

<style scoped>
main {
  min-height: 60vh;
}

.dojo-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.dojo-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}
</style>