<script setup lang="ts">
type XpRule = {
  action: string
  xp: string
}

const props = defineProps<{
  heading: string
  description: string
  startTo: string
  startLabel: string
  xpRules: XpRule[]
  tips: string[]
  keyboardSetupTips?: string[]
}>()
</script>

<template>
  <main class="dojo-start-page max-w-xl mx-auto px-4 py-14 space-y-8">
    <BackLink />

    <section class="start-card text-center space-y-4">
      <h1 class="start-heading">{{ props.heading }}</h1>
      <p class="start-subheading">{{ props.description }}</p>

      <NuxtLink :to="props.startTo" class="start-btn">
        {{ props.startLabel }}
      </NuxtLink>
    </section>

    <section class="start-card text-left">
      <details class="dropdown" open>
        <summary class="panel-title">XP breakdown</summary>
        <ul class="panel-list space-y-2 mt-3">
          <li v-for="rule in props.xpRules" :key="`${rule.action}-${rule.xp}`" class="panel-item">
            <span>{{ rule.action }}</span>
            <strong>{{ rule.xp }}</strong>
          </li>
        </ul>
      </details>
    </section>

    <section v-if="props.keyboardSetupTips?.length" class="start-card text-left">
      <details class="dropdown">
        <summary class="panel-title">Keyboard setup</summary>
        <ul class="tips-list mt-3">
          <li v-for="tip in props.keyboardSetupTips" :key="tip">{{ tip }}</li>
        </ul>
      </details>
    </section>

    <section class="start-card text-left space-y-4">
      <h2 class="panel-title">Before you start</h2>
      <ul class="tips-list">
        <li v-for="tip in props.tips" :key="tip">{{ tip }}</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.dojo-start-page {
  --blue: #A8CAE0;
  --purple: #D6A3D1;
}

.start-card {
  border-radius: 22px;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
}

.start-heading {
  font-size: 1.2rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #111827;
}

.start-subheading {
  font-size: 0.84rem;
  color: rgba(17, 24, 39, 0.75);
}

.start-btn {
  display: block;
  width: 100%;
  border-radius: 14px;
  padding: 0.72rem;
  font-weight: 600;
  text-align: center;
  background: var(--blue);
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #94bfd9;
  transform: translateY(-1px);
}

.panel-title {
  cursor: pointer;
  list-style: none;
  font-size: 0.92rem;
  font-weight: 700;
  color: #111827;
}

.panel-title::-webkit-details-marker {
  display: none;
}

.panel-title::after {
  content: '▾';
  float: right;
  color: rgba(17, 24, 39, 0.55);
}

.dropdown[open] .panel-title::after {
  transform: rotate(180deg);
}

.panel-list,
.tips-list {
  margin: 0;
  padding-left: 1rem;
}

.panel-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.86rem;
}

.tips-list li {
  font-size: 0.84rem;
  color: rgba(17, 24, 39, 0.8);
  margin-bottom: 0.45rem;
}
</style>
