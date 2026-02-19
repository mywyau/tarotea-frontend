<script setup lang="ts">
definePageMeta({
    middleware: ['coming-soon'],
    ssr: true
})

/**
 * 🔥 MOCK DATA
 * Replace later with real API call
 */

const totalXp = ref(3420)

const progressPercent = computed(() =>
    Math.round((30 / 100) * 100)
)

</script>

<template>
    <main class="max-w-2xl mx-auto px-4 py-16 space-y-10">

        <h1 class="text-3xl font-semibold">
            Your XP
        </h1>

        <div class="space-y-8">

            <!-- Total XP -->
            <div class="border rounded-xl p-8 text-center shadow-sm">
                <p class="text-sm text-gray-500 uppercase tracking-wide">
                    Total XP
                </p>

                <p class="text-5xl font-bold text-black mt-2">
                    {{ totalXp.toLocaleString() }}
                </p>
            </div>

            <!-- Level -->
            <div class="border rounded-xl p-8 shadow-sm space-y-4">

                <!-- <div class="flex justify-between items-center">
          <p class="text-sm text-gray-500 uppercase tracking-wide">
            Level
          </p>
          <p class="text-lg font-semibold">
            {{ level }}
          </p>
        </div> -->

                <!-- Progress bar -->
                <div class="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div class="bg-purple-400 h-3 rounded-full transition-all duration-700"
                        :style="{ width: progressPercent + '%' }" />
                </div>

                <p class="text-sm text-gray-500 text-right">
                    {{ 3420 }} / {{ 1000000 }} XP
                </p>

            </div>

        </div>

    </main>
</template>