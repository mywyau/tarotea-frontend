<script setup lang="ts">
const learnLinks = [
  { to: '/levels', label: 'Levels' },
  { to: '/topics', label: 'Topics' },
  { to: '/quiz', label: 'Quizzes' },
  { to: '/typing-practice', label: 'Typing practice' },
]

const supportLinks = [
  { to: '/contact', label: 'Contact' },
  { to: '/patch-notes', label: 'Patch notes' },
  { to: '/privacy-notice', label: 'Privacy notice' },
  { to: '/terms-of-service', label: 'Terms of service' },
  { to: '/refund-policy', label: 'Refund policy' },
]
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer-inner">
      <div class="footer-brand-column">
        <NuxtLink to="/" class="footer-brand">
          <span class="footer-brand-mark" aria-hidden="true">T</span>
          <span>TaroTea</span>
        </NuxtLink>
        <p>Build practical Cantonese through short, focused learning sessions.</p>
      </div>

      <nav class="footer-link-column" aria-labelledby="footer-learn-heading">
        <h2 id="footer-learn-heading">Learn</h2>
        <NuxtLink v-for="link in learnLinks" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>

      <nav class="footer-link-column" aria-labelledby="footer-support-heading">
        <h2 id="footer-support-heading">TaroTea</h2>
        <NuxtLink v-for="link in supportLinks" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
    </div>

    <div class="footer-meta">
      <span>© {{ new Date().getFullYear() }} TaroTea</span>
      <span>Learn and understand everyday Cantonese.</span>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: clamp(4rem, 9vw, 7rem);
  border-top: 1px solid rgb(var(--color-ink) / 0.09);
  background: rgb(var(--color-surface) / 0.55);
  color: rgb(var(--color-ink));
  font-family: var(--font-brand);
}

.app-footer-inner,
.footer-meta {
  max-width: var(--content-wide);
  margin-inline: auto;
  padding-inline: var(--page-gutter);
}

.app-footer-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(8rem, 0.7fr));
  gap: clamp(2rem, 7vw, 5rem);
  padding-top: clamp(2.5rem, 6vw, 4.5rem);
  padding-bottom: 2.5rem;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: rgb(var(--color-ink));
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-decoration: none;
}

.footer-brand-mark {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.7rem 0.7rem 0.7rem 0.25rem;
  background: linear-gradient(145deg, rgb(var(--color-taro-pink)), rgb(var(--color-taro-blue)));
  color: rgb(var(--color-primary-strong));
  font-size: 1rem;
}

.footer-brand-column p {
  max-width: 28rem;
  margin: 1rem 0 0;
  color: rgb(var(--color-muted));
  line-height: 1.65;
}

.footer-link-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
}

.footer-link-column h2 {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.footer-link-column a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  color: rgb(var(--color-muted));
  font-size: 0.875rem;
  text-decoration: none;
}

.footer-link-column a:hover {
  color: rgb(var(--color-primary-strong));
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.footer-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgb(var(--color-ink) / 0.07);
  padding-top: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  color: rgb(var(--color-muted));
  font-size: 0.75rem;
}

@media (max-width: 639px) {
  .app-footer-inner {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-brand-column {
    grid-column: 1 / -1;
  }

  .footer-meta {
    flex-direction: column;
  }
}
</style>
