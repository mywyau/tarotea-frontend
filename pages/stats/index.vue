<script setup lang="ts">

definePageMeta({
    ssr: true
})

const statsData = ref<any | null>(null)
const loading = ref(true)
const errorState = ref<string | null>(null)


try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const res = await $fetch('/api/user/stats', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    statsData.value = res

} catch (err) {
    console.error('Stats fetch failed', err)
    errorState.value = "Failed to load stats."
} finally {
    loading.value = false
}



const stats = computed(() => {
    if (!statsData.value) return []

    const masteryPercent = Math.round(
        (statsData.value.words_maxed / statsData.value.words_seen) * 100
    )

    return [
        {
            label: 'Total XP',
            value: Number(statsData.value.total_xp),
            suffix: '',
            color: 'text-purple-600'
        },
        {
            label: 'Words Maxed',
            value: Number(statsData.value.words_maxed),
            suffix: '',
            color: 'text-green-600'
        },
        {
            label: 'Words Seen',
            value: Number(statsData.value.words_seen),
            suffix: '',
            color: 'text-blue-600'
        },
        {
            label: 'Correct Answers',
            value: Number(statsData.value.total_correct),
            suffix: '',
            color: 'text-emerald-600'
        },
        {
            label: 'XP Last 7 days',
            value: Number(statsData.value.xp_this_week),
            color: 'text-orange-600'
        }
    ]
})

// const currentIndex = ref(0)

// const currentStat = computed(() => {
//     if (!stats.value.length) return null
//     return stats.value[currentIndex.value]
// })

// function nextStat() {
//     if (!stats.value.length) return
//     currentIndex.value =
//         (currentIndex.value + 1) % stats.value.length
// }

// function prevStat() {
//     if (!stats.value.length) return
//     currentIndex.value =
//         (currentIndex.value - 1 + stats.value.length) % stats.value.length
// }

</script>

<template>
    <main class="max-w-4xl mx-auto px-4 py-16 space-y-12">

        <h1 class="text-3xl font-semibold">
            Your Stats
        </h1>

        <div v-if="loading" class="text-center text-gray-400">
            Loading stats...
        </div>

        <div v-else-if="errorState" class="text-center text-red-500">
            {{ errorState }}
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div v-for="stat in stats" :key="stat.label"
                class="border rounded-xl p-6 text-center shadow-sm hover:shadow-md transition">
                <p class="text-xs text-gray-500 uppercase tracking-wide">
                    {{ stat.label }}
                </p>

                <p class="text-3xl font-bold mt-3" :class="stat.color">
                    {{ stat.value.toLocaleString() }}
                </p>
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