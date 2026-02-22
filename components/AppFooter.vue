<template>
    <footer class="mt-8">
        <div class="max-w-5xl mx-auto px-4 py-4 text-sm text-black">

            <div class="flex flex-col sm:flex-row justify-between gap-4">

                <!-- Left -->
                <div>
                    <div class="font-semibold text-black">
                        TaroTea
                    </div>
                    <p class="mt-1 max-w-sm hidden sm:block">
                        Learn and understand everyday Cantonese.
                    </p>
                </div>

                <!-- Right -->
                <div class="flex gap-4">

                    <NuxtLink to="/contact" class="hover:underline">
                        Contact
                    </NuxtLink>

                    <NuxtLink to="/privacy-notice" class="hover:underline">
                        Privacy Notice
                    </NuxtLink>

                    <NuxtLink to="/refund-policy" class="hover:underline">
                        Refund Policy
                    </NuxtLink>

                    <NuxtLink to="/terms-of-service" class="hover:underline">
                        Terms of Service
                    </NuxtLink>

                    <NuxtLink to="/patch-notes" class="hover:underline">
                        Patch Notes
                    </NuxtLink>
                </div>
            </div>

            <div class="mt-3 text-xs text-gray-600">
                © {{ new Date().getFullYear() }} TaroTea
            </div>

        </div>
    </footer>
</template>
