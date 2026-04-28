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
  guestNote?: string
}>()

const showAdvancedTips = ref(false)
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <BackLink />

    <section class="quiz-card text-center space-y-6">
      <h1 class="text-3xl font-semibold text-gray-900 level-heading">{{ props.heading }}</h1>

      <p class="text-black level-subheading">{{ props.description }}</p>

      <p v-if="props.guestNote" class="guest-note">
        {{ props.guestNote }}
      </p>

      <div class="pt-6">
        <NuxtLink :to="props.startTo" class="start-btn">
          {{ props.startLabel }}
        </NuxtLink>
      </div>

      <section class="tips-panel">
        <div class="tips-header">
          <h2 class="tips-title">XP breakdown</h2>
        </div>

        <div class="tips-grid">
          <article
            v-for="rule in props.xpRules"
            :key="`${rule.action}-${rule.xp}`"
            class="tip-card"
          >
            <h3 class="tip-card-title">{{ rule.action }}</h3>
            <p class="tip-card-body">{{ rule.xp }}</p>
          </article>
        </div>

        <button class="tips-toggle" type="button" @click="showAdvancedTips = !showAdvancedTips">
          {{ showAdvancedTips ? 'Hide extra tips' : 'See keyboard and prep tips' }}
        </button>

        <Transition name="tip-expand">
          <div v-if="showAdvancedTips" class="more-tips space-y-4">
            <section v-if="props.keyboardSetupTips?.length" class="text-left space-y-2">
              <h3 class="tips-title">Keyboard setup</h3>
              <ul class="more-tips-list">
                <li v-for="tip in props.keyboardSetupTips" :key="tip">{{ tip }}</li>
              </ul>
            </section>

            <section class="text-left space-y-2">
              <h3 class="tips-title">Before you start</h3>
              <ul class="more-tips-list">
                <li v-for="tip in props.tips" :key="tip">{{ tip }}</li>
              </ul>
            </section>
          </div>
        </Transition>
      </section>
    </section>
  </main>
</template>

<style scoped>
.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.quiz-card {
  border-radius: 26px;
  padding: 2rem;
}

.start-btn {
  display: block;
  width: 100%;
  border-radius: 16px;
  padding: 0.75rem;
  font-weight: 600;
  text-align: center;
  background: #A8CAE0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
  transform: translateY(-2px);
}

.tips-panel {
  margin-top: 1rem;
  text-align: left;
}

.tips-header {
  margin-bottom: 1rem;
}

.tips-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

.tips-grid {
  display: grid;
  gap: 0.75rem;
}

.tip-card {
  border-radius: 16px;
  background: #F6E1E1;
  padding: 0.9rem 1rem;
}

.tip-card-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #111827;
}

.tip-card-body {
  margin-top: 0.3rem;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(17, 24, 39, 0.82);
}

.guest-note {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(17, 24, 39, 0.8);
}

.tips-toggle {
  margin-top: 1rem;
  width: 100%;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  padding: 0.75rem;
  border-radius: 14px;
}

.tips-toggle:hover {
  background: rgba(168, 202, 224, 0.22);
}

.more-tips {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
}

.more-tips-list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
  color: rgba(17, 24, 39, 0.86);
  font-size: 0.85rem;
  line-height: 1.45;
}

.tip-expand-enter-active,
.tip-expand-leave-active {
  transition: all 0.2s ease;
}

.tip-expand-enter-from,
.tip-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
