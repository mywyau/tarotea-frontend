<script setup lang="ts">
definePageMeta({
  title: 'Terms of Service · TaroTea'
})
</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">

    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Terms of Service
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: {{ new Date().toLocaleDateString() }}
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        These Terms of Service (“Terms”) govern your use of TaroTea.
        By using the app, you agree to these Terms.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">1. About TaroTea</h2>
      <p class="text-gray-700">
        TaroTea is a web application designed to help users learn spoken Cantonese
        through vocabulary, audio, and exercises.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">2. Accounts</h2>
      <p class="text-gray-700">
        To access certain features, you may need to create an account.
        You are responsible for keeping your account secure and for any activity
        that occurs under your account.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">3. Subscriptions and payments</h2>
      <p class="text-gray-700">
        Some features of TaroTea may require a paid subscription.
        Payments are processed by third-party providers such as Stripe.
      </p>

      <p class="text-gray-700">
        Subscription pricing, billing periods, and cancellation options will be
        clearly shown before purchase. You may cancel your subscription at any time
        according to the terms provided during checkout.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">4. Content and availability</h2>
      <p class="text-gray-700">
        The content provided on TaroTea is for educational purposes only.
        We may update, modify, or remove content at any time as the app evolves.
      </p>

      <p class="text-gray-700">
        We do not guarantee that any particular content will always be available.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">5. Acceptable use</h2>
      <p class="text-gray-700">
        You agree not to misuse the service, including attempting to:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Access restricted areas without permission</li>
        <li>Distribute or resell content without authorisation</li>
        <li>Interfere with the operation or security of the app</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">6. Intellectual property</h2>
      <p class="text-gray-700">
        All content on TaroTea, including text, audio, and design, is owned by or
        licensed to TaroTea and is protected by intellectual property laws.
      </p>

      <p class="text-gray-700">
        You may use the content for personal learning purposes only.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">7. No guarantees</h2>
      <p class="text-gray-700">
        TaroTea is provided on an “as is” basis. While we aim to provide helpful and
        accurate learning materials, we do not guarantee fluency or specific learning
        outcomes.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">8. Limitation of liability</h2>
      <p class="text-gray-700">
        To the extent permitted by law, TaroTea will not be liable for any indirect,
        incidental, or consequential loss arising from your use of the app.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">9. Termination</h2>
      <p class="text-gray-700">
        We may suspend or terminate access to the service if these Terms are violated
        or if the app is discontinued.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">10. Governing law</h2>
      <p class="text-gray-700">
        These Terms are governed by the laws of the UK.
      </p>
    </section>

    <!-- <section class="space-y-3">
      <h2 class="text-xl font-semibold">11. Contact</h2>
      <p class="text-gray-700">
        If you have any questions about these Terms, please contact:
        <br />
        <span class="font-medium">contact@tarotea.dev</span>
      </p>
    </section> -->

  </main>
</template>
