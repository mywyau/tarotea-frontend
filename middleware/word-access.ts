export default defineNuxtRouteMiddleware((to) => {

  const topic = to.params.topic as string | undefined;
  const slug = to.params.slug as string | undefined;

  if (!topic) return;
  if (!slug) return;

  const { authReady, entitlement } = useMeStateV2();

  // ⛔ Wait for auth
  if (!authReady.value) {
    return;
  }

  // 🔹 First 4 free topics
  const FREE_TOPICS = [
    "survival-essentials",
    "greetings-polite",
    "fruits-vegetables",
    "clothing",
  ];

  const COMING_SOON_TOPICS = [
    "food-ordering",
    "measure-quantities",
    "time-dates",
    "money",
    "countries-nationalities",
    "transport-travel",
    "family-relationships",
    "furniture",
    "professions",
    "shopping",
    "health",
    "emotions",
    "daily-life",
    "directions",
    "weather",
    "emergencies",
    "phone-internet",
    "appointments",
    "housing",
    "school-education",
    "hobbies",
    "sports-fitness",
    "entertainment",
    "social-media",
    "opinions",
    "complaints",
    "celebrations",
    "culture",
    "dating",
    "news",
    "technology",
    "food-cooking",
    "travel-abroad",
    "slang",
  ];

  // ✅ Always allow free topics
  if (FREE_TOPICS.includes(topic)) {
    return;
  }

  // 🔒 Premium-only topics (if you later flip some to live)
  const hasPremium =
    entitlement.value?.active &&
    (entitlement.value.plan === "monthly" ||
      entitlement.value.plan === "yearly");

  if (!hasPremium) {
    return navigateTo("/upgrade");
  }
});
