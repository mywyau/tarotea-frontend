<script setup lang="ts">

// definePageMeta({
//   middleware: ['coming-soon'],
//   ssr: true,
// })

import { onMounted } from 'vue'

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  // hasPaidAccess,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

/**
 * Topic model
 */
type Topic = {
  id: string
  title: string
  description: string,

  comingSoon: boolean
  requiresPaid?: boolean
}

const topics = [

  {
    id: 'survival-essentials',
    title: 'Survival & Essentials',
    comingSoon: false,
    description: 'Essential phrases for getting by: toilets, emergencies, asking for help, and basic needs.',
    requiresPaid: false

  },
  {
    id: 'greetings-polite',
    title: 'Greetings & Politeness',
    comingSoon: false,
    description: 'Say hello, goodbye, thank people, apologise, and handle basic polite interactions.',
    requiresPaid: false

  },
  {
    id: 'fruits-vegetables',
    title: 'Fruit & Vegetables',
    comingSoon: false,
    description: 'Name and describe fruits and vegetables.',
    requiresPaid: false
  },
  {
    id: 'clothing',
    title: 'Clothing',
    comingSoon: false,
    description: 'Name and describe items of clothing.',
    requiresPaid: false
  },
  {
    id: 'measure-quantities',
    title: 'Measurements & Quantities',
    comingSoon: false,
    description: 'Describe amounts, sizes, prices, and quantities used in daily life and shopping.',
    requiresPaid: false
  },
  {
    id: 'time-dates',
    title: 'Time & Dates',
    comingSoon: false,
    description: 'Talk about time, days, dates, schedules, and when things happen.',
    requiresPaid: false
  },
  {
    id: 'dim-sum',   // new topic
    title: 'Dim Sum',
    comingSoon: false,
    description: 'Learn to order your favourite dim sum.'
  },
  {
    id: 'resturant-menu',
    title: 'Resturant Menu',
    comingSoon: true,
    description: 'Study and learn to order your favourite dishes.'
  },
  {
    id: 'money',
    title: 'Money & Payments',
    comingSoon: true,
    description: 'Discuss prices, paying, change, costs, and money-related situations.',
    requiresPaid: false
  },
  {
    id: 'countries-nationalities',
    title: 'Countries & Nationalities',
    comingSoon: true,
    description: 'Talk about where you are from, countries, languages, and cultural background.',
    requiresPaid: false
  },
  {
    id: 'transport-travel',
    title: 'Transport & Travel',
    comingSoon: true,
    description: 'Use transport, ask for directions, talk about travel plans, and get around the city.',
    requiresPaid: false
  },
  {
    id: 'family-relationships',
    title: 'Family & Relationships',
    comingSoon: true,
    description: 'Talk about family members, relatives, and personal relationships.',
    requiresPaid: false
  },
  {
    id: 'furniture',
    title: 'Home & Furniture',
    comingSoon: true,
    description: 'Describe your home, rooms, furniture, and everyday household items.',
    requiresPaid: false
  },
  {
    id: 'food-ordering',
    title: 'Food & Ordering',
    comingSoon: true,
    description: 'Talk about food, order at restaurants, express preferences, and ask for recommendations.',
    requiresPaid: false
  },
  {
    id: 'shopping',
    title: 'Shopping & Services',
    comingSoon: true,
    description: 'Shop for items, ask for help, compare options, and use everyday services.',
    requiresPaid: false
  },
  {
    id: 'health',
    title: 'Health & Wellbeing',
    comingSoon: true,
    description: 'Describe how you feel, talk about common health issues, and seek basic help.',
    requiresPaid: false
  },
  {
    id: 'emotions',
    title: 'Feelings & Emotions',
    comingSoon: true,
    description: 'Express emotions, moods, opinions, and personal reactions naturally.',
    requiresPaid: false
  },
  {
    id: 'daily-life',
    title: 'Daily Life & Routines',
    comingSoon: true,
    description: 'Talk about daily habits, routines, plans, and everyday activities.',
    requiresPaid: false
  },
  {
    id: 'professions',
    title: 'Work & Professions',
    comingSoon: true,
    description: 'Talk about jobs, workplaces, roles, and what people do for work.',
    requiresPaid: false
  },
  {
    id: 'directions',
    title: 'Directions & Locations',
    comingSoon: true,
    description: 'Ask for directions, describe locations, and navigate places confidently.',
    requiresPaid: false
  },
  {
    id: 'weather',
    title: 'Weather & Seasons',
    comingSoon: true,
    description: 'Talk about the weather, seasons, temperature, and climate.',
    requiresPaid: false
  },
  {
    id: 'emergencies',
    title: 'Emergencies & Safety',
    comingSoon: true,
    description: 'Handle urgent situations, ask for help, and explain problems clearly.',
    requiresPaid: false
  },
  {
    id: 'phone-internet',
    title: 'Phone & Internet',
    comingSoon: true,
    description: 'Use phone-related language, internet services, and digital communication.',
    requiresPaid: false
  },
  {
    id: 'appointments',
    title: 'Appointments & Scheduling',
    comingSoon: true,
    description: 'Make appointments, arrange meetings, and talk about availability.',
    requiresPaid: false
  },
  {
    id: 'housing',
    title: 'Housing & Renting',
    comingSoon: true,
    description: 'Discuss renting, housing issues, utilities, and living arrangements.',
    requiresPaid: false
  },
  {
    id: 'school-education',
    title: 'School & Education',
    comingSoon: true,
    description: 'Talk about studying, classes, learning, and educational experiences.',
    requiresPaid: false
  },
  {
    id: 'hobbies',
    title: 'Hobbies & Interests',
    comingSoon: true,
    description: 'Discuss hobbies, interests, and things you enjoy doing.',
    requiresPaid: false
  },
  {
    id: 'sports-fitness',
    title: 'Sports & Fitness',
    comingSoon: true,
    description: 'Talk about exercise, sports, health routines, and physical activities.',
    requiresPaid: false
  },
  {
    id: 'entertainment',
    title: 'Movies, TV & Entertainment',
    comingSoon: true,
    description: 'Discuss movies, TV shows, music, and entertainment preferences.',
    requiresPaid: false
  },
  {
    id: 'social-media',
    title: 'Social Media & Online Life',
    comingSoon: true,
    description: 'Talk about social platforms, posting, messaging, and online habits.',
    requiresPaid: false
  },
  {
    id: 'opinions',
    title: 'Opinions & Preferences',
    comingSoon: true,
    description: 'Express likes, dislikes, opinions, and personal preferences.',
    requiresPaid: false
  },
  {
    id: 'complaints',
    title: 'Complaints & Problems',
    comingSoon: true,
    description: 'Raise issues, complain politely, and explain problems.',
    requiresPaid: false
  },
  {
    id: 'celebrations',
    title: 'Celebrations & Festivals',
    comingSoon: true,
    description: 'Talk about festivals, holidays, celebrations, and special occasions.',
    requiresPaid: false
  },
  {
    id: 'culture',
    title: 'Culture & Customs',
    comingSoon: true,
    description: 'Understand cultural habits, customs, and social expectations.',
    requiresPaid: false
  },
  {
    id: 'dating',
    title: 'Dating & Relationships',
    comingSoon: true,
    description: 'Talk about dating, relationships, and social connections.',
    requiresPaid: false
  },
  {
    id: 'news',
    title: 'News & Current Events',
    comingSoon: true,
    description: 'Discuss news topics and everyday current events casually.',
    requiresPaid: false
  },
  {
    id: 'technology',
    title: 'Technology & Devices',
    comingSoon: true,
    description: 'Talk about phones, computers, apps, and everyday tech usage.',
    requiresPaid: false
  },
  {
    id: 'food-cooking',
    title: 'Cooking & Recipes',
    comingSoon: true,
    description: 'Describe cooking methods, ingredients, and food preparation.',
    requiresPaid: false
  },
  {
    id: 'travel-abroad',
    title: 'Travel Abroad',
    comingSoon: true,
    description: 'Handle airports, hotels, overseas travel, and travel-related conversations.',
    requiresPaid: false
  },
  {
    id: 'slang',
    title: 'Slang',
    comingSoon: true,
    description: 'Learn slang used in everyday life and in real situations.',
    requiresPaid: false
  },
  {
    id: 'animals',
    title: 'Animals',
    comingSoon: true,
    description: 'Learn the name of various animals.',
    requiresPaid: false
  },
  {
    id: 'plants',
    title: 'Plants',
    comingSoon: true,
    description: 'Learn the name of various plants.',
    requiresPaid: false
  },
  {
    id: 'verbs',
    title: 'Verbs',
    comingSoon: true,
    description: 'Study and learn common everyday verbs.',
    requiresPaid: false
  },
  {
    id: 'cutlery',
    title: 'Cutlery',
    comingSoon: true,
    description: 'Know the words of everyday cutlery and dining items.',
    requiresPaid: false
  },
]


/**
 * Can user enter this topic?
 */
function canEnterTopic(topic: Topic) {

  // if (!authReady.value) return false
  if (topic.comingSoon) return false

  // ✅ Free topic → always accessible
  if (!topic.requiresPaid) return true

  // 🔒 Paid topic → requires login + entitlement
  if (!isLoggedIn.value) return false
  return canAccessLevel(entitlement.value!)
}

function doNotShowUpgradeMessage(topic: Topic) {

  if (!topic.requiresPaid) return true
  if (!isLoggedIn.value) return false

  const doesNotHaveFreePlan =
    entitlement.value?.plan !== "free" &&
    (
      entitlement.value?.subscription_status === "active" ||
      entitlement.value?.subscription_status === "trialing" ||
      entitlement.value?.subscription_status === "past_due"
    )

  return doesNotHaveFreePlan
}

/**
 * Where should the link go?
 */
function topicLink(topic: Topic) {
  if (topic.comingSoon) return "/coming-soon"

  if (!topic.requiresPaid) {
    return `/topic/words/${topic.id}`
  }

  // Paid but not logged in
  if (!isLoggedIn.value) return "/signup"

  // Paid but no access
  if (!canAccessLevel(entitlement.value!)) return "/pricing"

  return `/topic/words/${topic.id}`
}

import { computed, ref } from 'vue'

const ITEMS_PER_PAGE = 12
const currentPage = ref(1)

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const sortedTopics = computed(() =>
  [...topics].sort((a, b) => {
    // Coming soon topics go to the end
    if (a.comingSoon !== b.comingSoon) {
      return a.comingSoon ? 1 : -1
    }

    // Optional: push paid topics after free ones
    if (!!a.requiresPaid !== !!b.requiresPaid) {
      return a.requiresPaid ? 1 : -1
    }

    return 0
  })
)

const totalPages = computed(() =>
  Math.ceil(sortedTopics.value.length / ITEMS_PER_PAGE)
)

const paginatedTopics = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return sortedTopics.value.slice(start, end)
})

watch(sortedTopics, () => {
  currentPage.value = 1
})

</script>


<template>
  <main v-if="authReady" class="topics-page max-w-5xl mx-auto py-12 px-4 space-y-4">

    <NuxtLink :to="`/`" class="inline-block text-sm text-black hover:underline">
      ← Home
    </NuxtLink>

    <header class="rounded-lg header-card">
      <h1 class="text-2xl font-semibold text-gray-900">Topics</h1>
      <p class="text-gray-700 text-sm mt-2 ">
        Vocabulary and sentences grouped by subject matter.
      </p>
    </header>

    <div v-if="totalPages > 1" class="pagination-wrapper flex justify-center items-center gap-3 pt-8">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">
        ←
      </button>

      <button v-for="page in totalPages" :key="page" @click="goToPage(page)" class="pagination-page"
        :class="{ 'is-active': page === currentPage }">
        {{ page }}
      </button>

      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow">
        →
      </button>
    </div>

    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">

      <li v-for="topic in paginatedTopics" :key="topic.id" class="topic-card rounded-lg p-4 space-y-3 transition"
        :class="[
          topic.comingSoon || (topic.requiresPaid && !canEnterTopic(topic))
            ? 'is-disabled'
            : 'is-active'
        ]">
        <NuxtLink :to="canEnterTopic(topic) ? topicLink(topic) : undefined" class="block space-y-3">
          <!-- Title row -->
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 leading-snug">
                {{ topic.title }}
              </h2>

              <p v-if="topic.comingSoon" class="mt-2">
                <span class="pill pill-soon">Coming soon</span>
              </p>

              <p v-else-if="topic.requiresPaid && !doNotShowUpgradeMessage(topic)" class="mt-2">
                <span class="pill pill-locked">Locked</span>
              </p>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-gray-700">
            {{ topic.description }}
          </p>
        </NuxtLink>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="pagination-wrapper flex justify-center items-center gap-3 pt-8">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">
        ←
      </button>

      <button v-for="page in totalPages" :key="page" @click="goToPage(page)" class="pagination-page"
        :class="{ 'is-active': page === currentPage }">
        {{ page }}
      </button>

      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow">
        →
      </button>
    </div>

  </main>

  <div v-else class="py-20 text-center text-gray-500">
    Loading topics...
  </div>
</template>

<style scoped>
/* Palette variables */
.topics-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  /* assuming this is what you meant */
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  /* Soft page background */
  /* background: linear-gradient(
    180deg,
    rgba(246, 225, 225, 0.70) 0%,
    rgba(255, 255, 255, 0.85) 45%,
    rgba(168, 202, 224, 0.40) 100%
  ); */
  border-radius: 16px;
}

/* Header card */
.header-card {
  /* background: rgba(255,255,255,0.65); */
  /* border-color: rgba(214, 163, 209, 0.40);  */
  backdrop-filter: blur(6px);
}

/* Topic cards */
.topic-card {
  /* border: 1px solid rgba(214, 163, 209, 0.35); */
  background: rgba(165, 213, 245, 0.441);
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}

.topic-card.is-active:hover {
  transform: translateY(-1px);
  background: rgba(215, 239, 255, 0.893);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.topic-card.is-disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: rgba(246, 225, 225, 0.35);
  /* blush wash */
  /* border-color: rgba(0,0,0,0.08); */
}

/* Pills (badges) */
.pill {
  display: inline-block;
  /* padding: 0.2rem 0.6rem; */
  /* border-radius: 999px; */
  font-size: 0.75rem;
  font-weight: 700;
  /* border: 1px solid rgba(0,0,0,0.06); */
}

/* Coming soon = blue tint */
.pill-soon {
  /* background: rgba(168, 202, 224, 0.55); */
  color: rgba(0, 0, 0, 0.75);
}

/* Locked = yellow tint (use sparingly) */
.pill-locked {
  background: rgba(244, 205, 39, 0.60);
  color: rgba(0, 0, 0, 0.80);
}

/* Pink + Yellow TaroTea pagination */

.pagination-wrapper {
  padding: 12px 16px;
  border-radius: 16px;
}

/* Page numbers */
.pagination-page {
  min-width: 38px;
  height: 38px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;

  background-color: #F6E1E1;
  /* blush */
  color: #3A2A2A;

  transition: all 0.18s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.pagination-page:hover {
  background-color: #EAB8E4;
  /* pink */
  transform: translateY(-1px);
}

/* Active page */
.pagination-page.is-active {
  background-color: #D6A3D1;
  /* stronger pink/purple */
  color: #000;
  box-shadow: 0 6px 16px rgba(214, 163, 209, 0.35);
  transform: translateY(-1px);
}

/* Arrows */
.pagination-arrow {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-weight: 600;

  background-color: rgba(244, 205, 39, 0.35);
  /* soft yellow */
  color: #3A2A2A;

  transition: all 0.18s ease;
}

.pagination-arrow:hover:not(:disabled) {
  background-color: rgba(244, 205, 39, 0.55);
  transform: translateY(-1px);
}

.pagination-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<!-- 
--brown: #8B5E3C;           /* brown sugar */
--brown-soft: #C69C6D;      /* milk tea */
--cream: #F5E6D3;           /* milk foam */
--caramel: #B87333;         /* caramel accent */ 
-->