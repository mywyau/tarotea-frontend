<template>
  <main class="max-w-xl mx-auto py-16 text-center">

    <div class="mt-12 grid grid-cols-2 gap-6 text-center">

      <div class="rounded-lg border p-6">
        <div class="text-base font-semibold">
          {{ stats?.activeUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-500">
          Active learners
        </div>
      </div>

      <div class="rounded-lg border p-6">
        <div class="text- font-semibold">
          {{ stats?.paidUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-500">
          Supporting the project
        </div>
      </div>
    </div>

    <p class="mt-8 text-gray-600">
      Learn and understand everyday Cantonese :)
    </p>

    <p class="mt-8 text-gray-600">
      App is a work in progress, thank you for your patience 
    </p>

    <NuxtLink to="/levels" class="mt-8 inline-block px-4 py-2 border rounded">
      Start with viewing levels →
    </NuxtLink>

  </main>
</template>
