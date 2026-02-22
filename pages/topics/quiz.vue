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
    hasPaidAccess,
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
        requiresPaid: true
    },
    {
        id: 'time-dates',
        title: 'Time & Dates',
        comingSoon: false,
        description: 'Talk about time, days, dates, schedules, and when things happen.',
        requiresPaid: true
    },
    {
        id: 'money',
        title: 'Money & Payments',
        comingSoon: true,
        description: 'Discuss prices, paying, change, costs, and money-related situations.',
        requiresPaid: true
    },
    {
        id: 'countries-nationalities',
        title: 'Countries & Nationalities',
        comingSoon: true,
        description: 'Talk about where you are from, countries, languages, and cultural background.',
        requiresPaid: true
    },
    {
        id: 'transport-travel',
        title: 'Transport & Travel',
        comingSoon: true,
        description: 'Use transport, ask for directions, talk about travel plans, and get around the city.',
        requiresPaid: true
    },
    {
        id: 'family-relationships',
        title: 'Family & Relationships',
        comingSoon: true,
        description: 'Talk about family members, relatives, and personal relationships.',
        requiresPaid: true
    },
    {
        id: 'furniture',
        title: 'Home & Furniture',
        comingSoon: true,
        description: 'Describe your home, rooms, furniture, and everyday household items.',
        requiresPaid: true
    },
    {
        id: 'food-ordering',
        title: 'Food & Ordering',
        comingSoon: true,
        description: 'Talk about food, order at restaurants, express preferences, and ask for recommendations.',
        requiresPaid: true
    },
    {
        id: 'shopping',
        title: 'Shopping & Services',
        comingSoon: true,
        description: 'Shop for items, ask for help, compare options, and use everyday services.',
        requiresPaid: true
    },
    {
        id: 'health',
        title: 'Health & Wellbeing',
        comingSoon: true,
        description: 'Describe how you feel, talk about common health issues, and seek basic help.',
        requiresPaid: true
    },
    {
        id: 'emotions',
        title: 'Feelings & Emotions',
        comingSoon: true,
        description: 'Express emotions, moods, opinions, and personal reactions naturally.',
        requiresPaid: true
    },
    {
        id: 'daily-life',
        title: 'Daily Life & Routines',
        comingSoon: true,
        description: 'Talk about daily habits, routines, plans, and everyday activities.',
        requiresPaid: true
    },
    {
        id: 'professions',
        title: 'Work & Professions',
        comingSoon: true,
        description: 'Talk about jobs, workplaces, roles, and what people do for work.',
        requiresPaid: true
    },
    {
        id: 'directions',
        title: 'Directions & Locations',
        comingSoon: true,
        description: 'Ask for directions, describe locations, and navigate places confidently.',
        requiresPaid: true
    },
    {
        id: 'weather',
        title: 'Weather & Seasons',
        comingSoon: true,
        description: 'Talk about the weather, seasons, temperature, and climate.',
        requiresPaid: true
    },
    {
        id: 'emergencies',
        title: 'Emergencies & Safety',
        comingSoon: true,
        description: 'Handle urgent situations, ask for help, and explain problems clearly.',
        requiresPaid: true
    },
    {
        id: 'phone-internet',
        title: 'Phone & Internet',
        comingSoon: true,
        description: 'Use phone-related language, internet services, and digital communication.',
        requiresPaid: true
    },
    {
        id: 'appointments',
        title: 'Appointments & Scheduling',
        comingSoon: true,
        description: 'Make appointments, arrange meetings, and talk about availability.',
        requiresPaid: true
    },
    {
        id: 'housing',
        title: 'Housing & Renting',
        comingSoon: true,
        description: 'Discuss renting, housing issues, utilities, and living arrangements.',
        requiresPaid: true
    },
    {
        id: 'school-education',
        title: 'School & Education',
        comingSoon: true,
        description: 'Talk about studying, classes, learning, and educational experiences.',
        requiresPaid: true
    },
    {
        id: 'hobbies',
        title: 'Hobbies & Interests',
        comingSoon: true,
        description: 'Discuss hobbies, interests, and things you enjoy doing.',
        requiresPaid: true
    },
    {
        id: 'sports-fitness',
        title: 'Sports & Fitness',
        comingSoon: true,
        description: 'Talk about exercise, sports, health routines, and physical activities.',
        requiresPaid: true
    },
    {
        id: 'entertainment',
        title: 'Movies, TV & Entertainment',
        comingSoon: true,
        description: 'Discuss movies, TV shows, music, and entertainment preferences.',
        requiresPaid: true
    },
    {
        id: 'social-media',
        title: 'Social Media & Online Life',
        comingSoon: true,
        description: 'Talk about social platforms, posting, messaging, and online habits.',
        requiresPaid: true
    },
    {
        id: 'opinions',
        title: 'Opinions & Preferences',
        comingSoon: true,
        description: 'Express likes, dislikes, opinions, and personal preferences.',
        requiresPaid: true
    },
    {
        id: 'complaints',
        title: 'Complaints & Problems',
        comingSoon: true,
        description: 'Raise issues, complain politely, and explain problems.',
        requiresPaid: true
    },
    {
        id: 'celebrations',
        title: 'Celebrations & Festivals',
        comingSoon: true,
        description: 'Talk about festivals, holidays, celebrations, and special occasions.',
        requiresPaid: true
    },
    {
        id: 'culture',
        title: 'Culture & Customs',
        comingSoon: true,
        description: 'Understand cultural habits, customs, and social expectations.',
        requiresPaid: true
    },
    {
        id: 'dating',
        title: 'Dating & Relationships',
        comingSoon: true,
        description: 'Talk about dating, relationships, and social connections.',
        requiresPaid: true
    },
    {
        id: 'news',
        title: 'News & Current Events',
        comingSoon: true,
        description: 'Discuss news topics and everyday current events casually.',
        requiresPaid: true
    },
    {
        id: 'technology',
        title: 'Technology & Devices',
        comingSoon: true,
        description: 'Talk about phones, computers, apps, and everyday tech usage.',
        requiresPaid: true
    },
    {
        id: 'food-cooking',
        title: 'Cooking & Recipes',
        comingSoon: true,
        description: 'Describe cooking methods, ingredients, and food preparation.',
        requiresPaid: true
    },
    {
        id: 'travel-abroad',
        title: 'Travel Abroad',
        comingSoon: true,
        description: 'Handle airports, hotels, overseas travel, and travel-related conversations.',
        requiresPaid: true
    },
    {
        id: 'slang',
        title: 'Slang',
        comingSoon: true,
        description: 'Learn slang used in everyday life and in real situations.',
        requiresPaid: true
    },
]

function canEnterTopic(topic: Topic) {

    if (!authReady.value) return false
    if (topic.comingSoon) return false

    // ✅ Free topic → always accessible
    if (!topic.requiresPaid) return true

    // 🔒 Paid topic → requires login + entitlement
    if (!isLoggedIn.value) return false
    return canAccessLevel(entitlement.value!)
}

function hasPaidAccessCheck(topic: Topic) {

    if (!authReady.value) return false

    // ✅ Free topic → always accessible
    if (!topic.requiresPaid) return true

    // 🔒 Paid topic → requires login + entitlement
    if (!isLoggedIn.value) return false
    return canAccessLevel(entitlement.value!)
}

</script>


<template>
    <main class="topics-page max-w-6xl mx-auto py-10 px-4 space-y-8">

        <!-- Intro -->
        <header class="text-center space-y-3 max-w-2xl mx-auto">
            <h1 class="text-3xl font-semibold text-gray-900">
                Topic Quiz
            </h1>
            <p class="text-gray-600 text-sm sm:text-base">
                Practice Cantonese by topic. Your weakest words appear more often as you improve.
            </p>
        </header>

        <!-- Grid -->
        <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            <li v-for="topic in topics" :key="topic.id" class="topic-card" :class="[
                topic.comingSoon || (topic.requiresPaid && !canEnterTopic(topic))
                    ? 'topic-locked'
                    : ''
            ]">

                <!-- Header -->
                <div class="space-y-2">
                    <h2 class="text-lg font-semibold text-gray-900">
                        {{ topic.title }}
                    </h2>

                    <p class="text-sm text-gray-600 leading-relaxed">
                        {{ topic.description }}
                    </p>

                    <p v-if="topic.comingSoon" class="text-xs text-gray-400 font-medium">
                        Coming soon
                    </p>
                </div>

                <!-- Buttons -->
                <div class="grid grid-cols-2 gap-3 pt-4">

                    <NuxtLink :to="canEnterTopic(topic) ? `/topic/quiz/vocabulary/word/${topic.id}` : undefined"
                        class="topic-btn topic-btn-blue"
                        :class="{ 'pointer-events-none opacity-60': topic.comingSoon }">
                        Vocab
                    </NuxtLink>

                    <NuxtLink :to="canEnterTopic(topic) ? `/topic/quiz/vocabulary/audio/${topic.id}` : undefined"
                        class="topic-btn topic-btn-purple"
                        :class="{ 'pointer-events-none opacity-60': topic.comingSoon }">
                        Audio
                    </NuxtLink>

                    <NuxtLink :to="canEnterTopic(topic) ? `/topic/quiz/sentences/${topic.id}` : undefined"
                        class="topic-btn topic-btn-yellow col-span-2"
                        :class="{ 'pointer-events-none opacity-60': topic.comingSoon }">
                        Sentences
                    </NuxtLink>

                </div>

                <p v-if="!hasPaidAccessCheck(topic)" class="text-xs text-center text-gray-500 pt-3">
                    Upgrade to unlock
                </p>

            </li>

        </ul>
    </main>
</template>

<style scoped>
.topics-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

/* Card */
.topic-card {
  border-radius: 24px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.topic-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.topic-locked {
  opacity: 0.6;
}

/* Buttons */
.topic-btn {
  text-align: center;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 14px;
  font-weight: 600;
  transition: all 0.15s ease;
}

/* Colour variations */
.topic-btn-blue {
  background: rgba(168, 202, 224, 0.45);
  color: #1f2937;
}

.topic-btn-blue:hover {
  background: rgba(168, 202, 224, 0.65);
}

.topic-btn-purple {
  background: rgba(214, 163, 209, 0.45);
  color: #1f2937;
}

.topic-btn-purple:hover {
  background: rgba(214, 163, 209, 0.65);
}

.topic-btn-yellow {
  background: rgba(244, 205, 39, 0.45);
  color: #1f2937;
}

.topic-btn-yellow:hover {
  background: rgba(244, 205, 39, 0.65);
}
</style>