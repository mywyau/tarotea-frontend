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

</script>

<template>
  <main v-if="authReady" class="max-w-5xl mx-auto py-12 px-4 space-y-8">

    <header>
      <p class="text-gray-500 text-sm mt-2">
        Vocabulary and sentences grouped by subject matter.
      </p>
    </header>

    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      <li v-for="topic in topics" :key="topic.id" class="border rounded-lg p-4 space-y-3 transition" :class="[
        topic.comingSoon || (topic.requiresPaid && !canEnterTopic(topic))
          ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-70'
          : 'hover:bg-gray-50 cursor-pointer'
      ]">

        <NuxtLink :to="canEnterTopic(topic) ? topicLink(topic) : undefined" class="block space-y-2">
          <!-- Title row -->
          <div class="flex items-center justify-between">

            <h2 class="text-lg font-medium">
              {{ topic.title }}
              <p v-if="topic.comingSoon" class="text-sm text-gray-400 font-normal">
                (Coming soon)
              </p>
            </h2>

          </div>

          <!-- Description -->
          <p class="text-sm text-gray-600">
            {{ topic.description }}
          </p>

          <!-- Locked message -->
          <p v-if="topic.requiresPaid && !doNotShowUpgradeMessage(topic)" class="text-xs text-gray-400 pt-1">
            Locked — upgrade to access
          </p>
        </NuxtLink>
      </li>
    </ul>
  </main>

  <div v-else class="py-20 text-center text-gray-400">
    Loading topics...
  </div>
</template>