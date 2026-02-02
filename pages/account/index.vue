<script setup lang="ts">
import { onMounted } from 'vue'

const {
    authReady,
    isLoggedIn,
    user,
    resolve
} = useMeStateV2()

// Resolve auth once on mount
onMounted(async () => {
    if (!authReady.value) {
        await resolve()
    }
})

async function openBillingPortal() {
    // Extra guard (defensive, but nice)
    if (!isLoggedIn.value) return

    const auth = await useAuth()
    const token = await auth.getAccessToken()

    const { url } = await $fetch<{ url: string }>('/api/stripe/portal', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    window.location.href = url
}
</script>


<template>
    <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

        <h1 class="text-3xl font-semibold">
            Account
        </h1>

        <!-- Loading -->
        <p v-if="!authReady" class="text-gray-500">
            Loading…
        </p>

        <!-- Account details -->
        <div v-else-if="isLoggedIn" class="space-y-6">

            <div class="border rounded-lg p-4 space-y-2">
                <p class="text-sm text-gray-500">Signed in as</p>
                <p class="font-medium">{{ user.email }}</p>
            </div>

            <div class="border rounded-lg p-4 space-y-2">
                <p class="text-sm text-gray-500">Plan</p>

                <p class="font-medium">
                    <span v-if="user!.plan === 'monthly'">Monthly</span>
                    <span v-else-if="user!.plan === 'yearly'">Yearly</span>
                    <span v-else>Free</span>
                </p>

                <p v-if="user!.active === false" class="text-sm text-gray-500">
                    Cancels at end of billing period
                </p>
            </div>

            <!-- Billing -->
            <button v-if="user!.plan !== 'free'"
                class="w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition"
                @click="openBillingPortal">
                Manage billing
            </button>

            <NuxtLink v-else to="/upgrade"
                class="bg-black rounded-lg text-white block text-center py-3 font-medium hover:bg-gray-800 transition">
                Upgrade plan
            </NuxtLink>

        </div>

        <!-- Not signed in -->
        <div v-else class="text-center space-y-4">
            <p class="text-gray-600">
                You’re not signed in.
            </p>
        </div>

    </main>
</template>
