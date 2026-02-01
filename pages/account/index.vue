<script setup lang="ts">

// definePageMeta({
//   middleware: ['auth-required']
// })

const { me, authReady } = useMeState()

async function openBillingPortal() {

    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const { url } = await $fetch('/api/stripe/portal', {
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
        <div v-else-if="me" class="space-y-6">

            <div class="border rounded-lg p-4 space-y-2">
                <p class="text-sm text-gray-500">Signed in as</p>
                <p class="font-medium">{{ me.email }}</p>
            </div>

            <div class="border rounded-lg p-4 space-y-2">
                <p class="text-sm text-gray-500">Plan</p>

                <p class="font-medium">
                    <span v-if="me.plan === 'monthly'">Monthly</span>
                    <span v-else-if="me.plan === 'yearly'">Yearly</span>
                    <span v-else>Free</span>
                </p>

                <p v-if="me.active === false" class="text-sm text-gray-500">
                    Cancels at end of billing period
                </p>
            </div>

            <!-- Billing -->
            <button v-if="me.plan !== 'free'"
                class="w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition"
                @click="openBillingPortal">
                Manage billing
            </button>

            <NuxtLink v-else to="/upgrade"
                class="block text-center rounded-lg border py-3 font-medium hover:bg-gray-50">
                Upgrade plan
            </NuxtLink>

        </div>

        <!-- Not signed in -->
        <div v-else class="text-center space-y-4">
            <p class="text-gray-600">
                You’re not signed in.
            </p>
            <NuxtLink to="/login" class="text-blue-600 hover:underline">
                Sign in
            </NuxtLink>
        </div>

    </main>
</template>
