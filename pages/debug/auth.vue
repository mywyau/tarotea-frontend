<script setup lang="ts">

definePageMeta({
    middleware: () => {
        if (process.env.NODE_ENV !== 'development') {
            return navigateTo('/')
        }
    }
})

import { onMounted } from 'vue'

const {
    state,
    authReady,
    isLoggedIn,
    user,
    resolve
} = useMeStateV2()

// Optional: auto-resolve on mount
onMounted(async () => {
    if (!authReady.value) {
        await resolve()
    }
})
</script>

<template>
    <main class="max-w-3xl mx-auto p-6 space-y-6">

        <h1 class="text-2xl font-semibold">
            Auth Debug Page
        </h1>

        <!-- Status summary -->
        <section class="border rounded p-4 space-y-2">
            <h2 class="font-medium">Summary</h2>

            <div>
                <strong>authReady:</strong>
                <span>{{ authReady }}</span>
            </div>

            <div>
                <strong>state.status:</strong>
                <span>{{ state.status }}</span>
            </div>

            <div>
                <strong>isLoggedIn:</strong>
                <span>{{ isLoggedIn }}</span>
            </div>
        </section>

        <!-- User data -->
        <section class="border rounded p-4 space-y-2">
            <h2 class="font-medium">User</h2>

            <pre class="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {{ user ?? 'null' }}
            </pre>
        </section>

        <!-- Controls -->
        <section class="border rounded p-4 space-y-3">
            <h2 class="font-medium">Controls</h2>

            <button class="border rounded px-4 py-2 hover:bg-gray-100" @click="resolve">
                Resolve Auth
            </button>
        </section>

        <!-- Raw state (last resort) -->
        <section class="border rounded p-4 space-y-2">
            <h2 class="font-medium text-gray-600">
                Raw state (for debugging)
            </h2>

            <pre class="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {{ state }}
            </pre>
        </section>
    </main>
</template>
