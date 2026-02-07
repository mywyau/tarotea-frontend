<script setup lang="ts">
definePageMeta({
  title: 'Refund Policy · TaroTea'
})
</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">

    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Refund Policy
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: {{ new Date().toLocaleDateString() }}
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        This Refund Policy explains how refunds are handled for subscriptions
        purchased on TaroTea.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">1. Digital subscriptions</h2>

      <p class="text-gray-700">
        TaroTea provides access to digital learning content through monthly or yearly
        subscriptions.
      </p>

      <p class="text-gray-700">
        Once access has been granted, subscription payments are generally
        <strong>non-refundable</strong>, including for partially used billing periods.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">2. Canceling your subscription</h2>

      <p class="text-gray-700">
        You may cancel your subscription at any time.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          Your subscription will remain active until the end of your current billing period.
        </li>
        <li>
          You will not be charged again after cancellation.
        </li>
        <li>
          No refunds are issued for unused time.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">3. Account deletion</h2>

      <p class="text-gray-700">
        Deleting your account permanently removes your access to TaroTea and any associated data.
      </p>

      <p class="text-gray-700">
        Deleting your account does <strong>not</strong> automatically result in a refund.
        Any remaining subscription time is forfeited.
      </p>

      <p class="text-gray-700">
        This action cannot be undone.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">4. Exceptions</h2>

      <p class="text-gray-700">
        Refunds may be considered in limited circumstances, such as:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Duplicate or accidental charges</li>
        <li>Technical issues preventing access to paid content</li>
      </ul>

      <p class="text-gray-700">
        If you believe you were charged in error, please contact us and we will review the issue.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">5. How to contact us</h2>

      <p class="text-gray-700">
        For billing or refund questions, please contact:
        <br />
        <span class="font-medium">billing@tarotea.com</span>
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">6. Changes to this policy</h2>

      <p class="text-gray-700">
        We may update this Refund Policy from time to time. Any changes will be reflected on this page.
      </p>
    </section>

  </main>
</template>
