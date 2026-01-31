<script setup lang="ts">
definePageMeta({
  title: 'TaroTea Pro'
})

const router = useRouter()

function joinPro() {
  // 🔍 fake paywall signal
  console.log('[paywall] join_pro_clicked')

  // Optional: send to analytics later
  // useTrack('join_pro_clicked')

  alert(
    'Payments are not live yet.\n\nThis helps me understand what to build next — thank you!'
  )
}

function goBack() {
  router.back()
}
</script>

<template>
  <main class="max-w-md mx-auto px-4 py-20 space-y-8 text-center">

    <h1 class="text-3xl font-semibold">
      Coming soon
    </h1>

    <p class="text-gray-600">
      Unlock all levels and learn Cantonese without limits.
    </p>

    <ul class="text-left text-gray-700 space-y-2 max-w-sm mx-auto">
      <li>• Full access to all levels</li>
      <li>• Native Cantonese audio for every word</li>
      <li>• No fluff, neatly organised content</li>
      <li>• New content added regularly</li>
      <li>• Randomised exercises and tests</li>
    </ul>

    <div class="pt-4">
      <div class="text-2xl font-medium">
        £5.99 <span class="text-base text-gray-500">/ month</span>
      </div>
      <div class="text-sm mt-2 text-gray-500">
        Cancel anytime
      </div>
    </div>

    <!-- <div class="space-y-3 pt-4">
      <button
        class="block w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition"
        @click="joinPro"
      >
        Join Pro
      </button>

      <button
        class="w-full text-gray-500 hover:underline"
        @click="goBack"
      >
        Not now
      </button>
    </div> -->

  </main>
</template>
