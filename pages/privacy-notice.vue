<script setup lang="ts">
definePageMeta({
  title: 'Privacy Notice · TaroTea'
})
</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">

    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Privacy Notice
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: {{ new Date().toLocaleDateString() }}
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        TaroTea (“we”, “us”, “our”) respects your privacy and is committed to protecting
        your personal data. This Privacy Notice explains how we collect, use, and protect
        your information when you use TaroTea.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">1. Who we are</h2>
      <p class="text-gray-700">
        TaroTea is a web application for learning spoken Cantonese.
      </p>
      <p class="text-gray-700">
        If you have any questions about this notice or your data, you can contact us at:
        <br />
        <span class="font-medium">Email:</span> contact@tarotea.dev
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">2. What data we collect</h2>

      <p class="text-gray-700">
        We only collect the data we need to operate the service.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Account information:</strong> email address, user ID, and subscription status.
        </li>
        <li>
          <strong>Authentication:</strong> handled by Auth0. We do not store passwords.
        </li>
        <li>
          <strong>Payment information:</strong> processed by Stripe. We do not store card details.
        </li>
        <li>
          <strong>Usage data:</strong> limited technical data such as page views or error logs.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">3. How we use your data</h2>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>To create and manage your account</li>
        <li>To provide access to free and paid content</li>
        <li>To process subscriptions and billing</li>
        <li>To improve reliability and usability</li>
        <li>To communicate important service updates</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">4. Legal basis for processing</h2>

      <p class="text-gray-700">
        Under UK GDPR, we process your data on the following bases:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li><strong>Contract</strong> – to provide the service you sign up for</li>
        <li><strong>Legitimate interests</strong> – to operate and improve the app</li>
        <li><strong>Legal obligation</strong> – for billing and accounting where required</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">5. Third-party services</h2>

      <p class="text-gray-700">
        We use trusted third-party providers to operate TaroTea:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Auth0 – authentication and login</li>
        <li>Stripe – payment processing</li>
        <li>Hosting and infrastructure providers</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">6. Data retention</h2>

      <p class="text-gray-700">
        We retain your data only as long as necessary:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Account data while your account is active</li>
        <li>Billing records as required by law</li>
        <li>You may request deletion of your account at any time</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">7. Your rights</h2>

      <p class="text-gray-700">
        Under UK GDPR, you have the right to:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to certain processing</li>
        <li>Request data portability</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">8. Cookies</h2>

      <p class="text-gray-700">
        TaroTea uses essential cookies required for authentication and session management.
        We do not use advertising cookies.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">9. Changes to this notice</h2>

      <p class="text-gray-700">
        We may update this Privacy Notice from time to time. Any significant changes will
        be reflected on this page.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">10. Contact</h2>

      <p class="text-gray-700">
        If you have any questions about this Privacy Notice, please contact:
        <br />
        <span class="font-medium">contact@tarotea.dev</span>
      </p>
    </section>

  </main>
</template>
