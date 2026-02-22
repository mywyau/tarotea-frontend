<script setup lang="ts">

definePageMeta({
    ssr: false
})

const statsData = ref<any | null>(null)
const loading = ref(true)
const errorState = ref<string | null>(null)

const stats = computed(() => {
    if (!statsData.value) return []

    const masteryPercent = Math.round(
        (statsData.value.words_maxed / statsData.value.words_seen) * 100
    )

    return [
        {
            label: 'Total XP',
            value: Number(statsData.value.total_xp),
            suffix: 'xp',
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
            suffix: 'xp',
            color: 'text-orange-600'
        }
    ]
})


onMounted(async () => {
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
})


</script>

<template>
    <main class="max-w-4xl mx-auto px-4 py-16 space-y-12">

        <div v-if="loading" class="text-center text-gray-400">
            Loading stats...
        </div>

        <div v-else-if="errorState" class="text-center text-red-500">
            {{ errorState }}
        </div>

        <div v-else>
            <h1 class="text-3xl font-semibold">
                Your Stats
            </h1>

            <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <div v-for="(stat, index) in stats" :key="stat.label" class="stat-card" :class="`stat-${index}`">
                    <p class="stat-label">
                        {{ stat.label }}
                    </p>

                    <p class="stat-value">
                        {{ stat.value.toLocaleString() }} {{ stat.suffix }}
                    </p>
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

/* Page background (soft like homepage) */
main {
    border-radius: 24px;
}

/* Card base */
.stat-card {
    border-radius: 22px;
    padding: 1.5rem;
    text-align: center;
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

/* Label */
.stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(17, 24, 39, 0.65);
}

/* Value */
.stat-value {
    font-size: 1.9rem;
    font-weight: 700;
    margin-top: 0.75rem;
    color: #111827;
}

/* Colour variations using your palette */
.stat-0 {
    background: rgba(234, 184, 228, 0.45);
}

/* Total XP */
.stat-1 {
    background: rgba(168, 202, 224, 0.45);
}

/* Words Maxed */
.stat-2 {
    background: rgba(244, 205, 39, 0.35);
}

/* Words Seen */
.stat-3 {
    background: rgba(246, 225, 225, 0.75);
}

/* Correct Answers */
.stat-4 {
    background: rgba(214, 163, 209, 0.40);
}

/* XP Last 7 Days */
</style>