<script setup lang="ts">
import { CheckCircle2, Headphones, Shuffle, Sparkles, Target, Trophy } from '@lucide/vue'
import { markRaw } from 'vue'

const props = defineProps<{
  primaryTips: {
    title: string
    body: string
  }[]
  scoringTips: string[]
}>()

const showAllTips = ref(false)

const primaryTipIcons = [markRaw(Target), markRaw(Sparkles), markRaw(Trophy)]
const getPrimaryTipIcon = (index: number) => primaryTipIcons[index % primaryTipIcons.length]
const scoringTipIcons = [
  markRaw(CheckCircle2),
  markRaw(Target),
  markRaw(Sparkles),
  markRaw(Trophy),
  markRaw(CheckCircle2),
  markRaw(Sparkles),
  markRaw(Shuffle),
  markRaw(Headphones),
]
const getScoringTipIcon = (index: number) => scoringTipIcons[index % scoringTipIcons.length]
</script>

<template>
  <section class="tips-panel">
    <div class="tips-header">
      <h2 class="tips-title">Before you start</h2>
    </div>

    <div class="tips-grid">
      <article v-for="(tip, index) in props.primaryTips" :key="tip.title" class="tip-card">
        <span class="tip-icon-badge" aria-hidden="true">
          <component :is="getPrimaryTipIcon(index)" class="tip-icon" />
        </span>
        <div>
          <h3 class="tip-card-title">{{ tip.title }}</h3>
          <p class="tip-card-body">{{ tip.body }}</p>
        </div>
      </article>
    </div>

    <button class="tips-toggle" type="button" @click="showAllTips = !showAllTips">
      {{ showAllTips ? 'Hide All Tips' : 'See All Tips' }}
    </button>

    <Transition name="tip-expand">
      <div v-if="showAllTips" class="more-tips">
        <ul class="more-tips-list">
          <li v-for="(tip, index) in props.scoringTips" :key="tip">
            <span class="more-tip-icon-badge" aria-hidden="true">
              <component :is="getScoringTipIcon(index)" class="more-tip-icon" />
            </span>
            <span>{{ tip }}</span>
          </li>
        </ul>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
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
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 16px;
  background: #F6E1E1;
  padding: 0.9rem 1rem;
}

.tip-icon-badge,
.more-tip-icon-badge {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: #8f4f88;
}

.tip-icon-badge {
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.05rem;
}

.tip-icon {
  width: 1.15rem;
  height: 1.15rem;
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
  background: rgba(168, 202, 224, 0.18);
}

.more-tips {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
}

.more-tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.65rem;
}

.more-tips-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #374151;
}

.more-tip-icon-badge {
  width: 1.1rem;
  height: 1.1rem;
  margin-top: 0.15rem;
}

.more-tip-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.tip-expand-enter-active,
.tip-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.tip-expand-enter-from,
.tip-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
