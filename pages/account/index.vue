<script setup lang="ts">

const {
    authReady,
    isLoggedIn,
    user,
    entitlement,
    isCanceling,
    currentPeriodEnd,
    resolve
} = useMeStateV2()


import { useRouter } from 'vue-router'

const router = useRouter()
const deleting = ref(false)
const deleteConfirmInput = ref('')

async function deleteAccount() {
    if (!isLoggedIn.value) return
    if (deleteConfirmInput.value.trim().toLowerCase() !== 'delete') return

    deleting.value = true

    try {
        const auth = await useAuth()
        const token = await auth.getAccessToken()

        await $fetch('/api/account', {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                confirm: 'DELETE'
            }
        })

        await auth.client?.logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        })
    } catch (err: any) {
        console.error('Account deletion failed', err)
        alert(
            err?.data?.statusMessage ??
            'Something went wrong deleting your account. Please try again.'
        )
    } finally {
        deleting.value = false
        deleteConfirmInput.value = ''
    }
}


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
                    <span v-if="entitlement?.plan === 'monthly'">Monthly</span>
                    <span v-else-if="entitlement?.plan === 'yearly'">Yearly</span>
                    <span v-else>Free</span>
                </p>

                <p v-if="isCanceling && currentPeriodEnd" class="text-sm text-gray-500">
                    Cancels on {{ currentPeriodEnd.toLocaleDateString() }}
                </p>

                <p v-else-if="entitlement?.subscription_status === 'active' && currentPeriodEnd"
                    class="text-sm text-gray-500">
                    Renews on {{ currentPeriodEnd.toLocaleDateString() }}
                </p>

                <p v-else-if="entitlement?.subscription_status === 'past_due'" class="text-sm text-red-600">
                    Payment issue — update your card to keep access
                </p>

            </div>

            <!-- Billing -->
            <button v-if="entitlement && entitlement.plan !== 'free'"
                class="w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition"
                @click="openBillingPortal">
                Manage billing
            </button>

            <NuxtLink v-else to="/upgrade"
                class="bg-black rounded-lg text-white block text-center py-3 font-medium hover:bg-gray-800 transition">
                Upgrade plan
            </NuxtLink>

            <!-- Danger zone -->
            <div class="border border-red-200 rounded-lg p-4 space-y-4">

                <p class="text-sm text-red-600">
                    Deleting your account permanently removes your data and subscription.
                    This action cannot be undone.
                </p>

                <div class="space-y-2">
                    <label class="block text-sm text-gray-700">
                        Type <span class="font-mono font-semibold">delete</span> to confirm
                    </label>

                    <input v-model="deleteConfirmInput" type="text" placeholder="delete"
                        class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>

                <button
                    class="w-full rounded-lg border border-red-500 text-red-600 py-3 font-medium hover:bg-red-50 transition disabled:opacity-50"
                    :disabled="deleting || deleteConfirmInput.trim().toLowerCase() !== 'delete'" @click="deleteAccount">
                    {{ deleting ? 'Deleting account…' : 'Delete account' }}
                </button>
            </div>


        </div>

        <!-- Not signed in -->
        <div v-else class="text-center space-y-4">
            <p class="text-gray-600">
                You’re not signed in.
            </p>
        </div>

    </main>
</template>
