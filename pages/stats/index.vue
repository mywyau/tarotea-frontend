<script setup lang="ts">

definePageMeta({
    middleware: ['coming-soon'],
    ssr: true
})

/**
 * 🔥 MOCK DATA
 */
const stats = [
    {
        label: 'Total XP',
        value: 3420,
        suffix: '',
        color: 'text-purple-600'
    },
    {
        label: 'Words Mastered',
        value: 47,
        suffix: '',
        color: 'text-green-600'
    }
]

const currentIndex = ref(0)

const currentStat = computed(() => stats[currentIndex.value])

function nextStat() {
    currentIndex.value =
        (currentIndex.value + 1) % stats.length
}

function prevStat() {
    currentIndex.value =
        (currentIndex.value - 1 + stats.length) % stats.length
}
</script>

<template>
    <main class="max-w-2xl mx-auto px-4 py-16 space-y-10">

        <h1 class="text-3xl font-semibold">
            Your Stats
        </h1>

        <div class="space-y-8">

            <!-- Stat Card -->
            <div class="border rounded-xl p-10 text-center shadow-sm transition-all duration-300">
                <p class="text-sm text-gray-500 uppercase tracking-wide">
                    {{ currentStat.label }}
                </p>

                <transition name="fade" mode="out-in">
                    <p :key="currentStat.label" class="text-5xl font-bold mt-4" :class="currentStat.color">
                        {{ currentStat.value.toLocaleString() }}
                        {{ currentStat.suffix }}
                    </p>
                </transition>

                <!-- Controls -->
                <div class="flex justify-center gap-6 mt-8 text-sm text-gray-500">
                    <button @click="prevStat" class="hover:text-black transition">
                        ← Previous
                    </button>
                    <button @click="nextStat" class="hover:text-black transition">
                        Next →
                    </button>
                </div>
            </div>

        </div>

    </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.35s ease, transform 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>