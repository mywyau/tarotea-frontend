# TaroTea 🍵

TaroTea is a focused web app for learning **real, spoken Cantonese** through vocabulary, audio, and interactive quizzes.

The goal is not academic Cantonese, but the words and phrases you actually hear and use in daily life.

---

## Features

- 📚 Structured vocabulary by level and topic
- 🧠 Word quizzes and audio listening quizzes
- 🔊 Native Cantonese audio
- 🔐 Auth0 authentication (Google login)
- 💳 Stripe subscriptions (Free / Pro)
- 🗑️ Full account deletion with data and billing cleanup

Daily vocabulary and the Daily Jyutping guessing game are paused by default. Set
`NUXT_PUBLIC_DAILY_PRACTICE_ENABLED=true` and restart the app or redeploy to enable both.

---

## Tech Stack

- **Frontend:** Nuxt 3 + Vue + Tailwind CSS
- **Backend:** Nuxt server routes (Nitro)
- **Auth:** Auth0 (JWT-based)
- **Billing:** Stripe Checkout + Billing Portal
- **Database:** PostgreSQL (Supabase)
- **Content delivery:** Vocabulary JSON and audio served from CDN

---

## Architecture Overview

- Auth0 user ID (`sub`) is the primary user identifier
- Users are created on first login
- Vocabulary data is stored as JSON and fetched from a CDN
- Stripe is the source of truth for billing
- Entitlements are mirrored locally for fast access checks

---

## Account Deletion

Users can permanently delete their account.

Deletion flow:
1. User confirms deletion
2. Stripe subscriptions are canceled
3. App data is deleted
4. Auth0 user is removed

If billing cancellation fails, deletion is blocked and must be retried.

---

## Local Development

### 1) Clean local build artifacts

```bash
rm -rf .nuxt node_modules .output
```

### 2) Install dependencies

```bash
npm install
```

### 3) Run development server

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

### 5) Preview production build

```bash
npm run preview
```

---

## Data Seeding

### Seed topic words

```bash
npx tsx scripts/seed-topics.ts
```

### Seed level words

```bash
npx tsx scripts/seed-levels.ts
```

---

## Project Status

🚧 Actively developed. This project is evolving and features may change.

---

## Philosophy

- Keep the app simple and calm
- Teach natural Cantonese, not textbook grammar
- Respect user data: no dark patterns, easy deletion

## Deploying protected lessons

Set `R2_LESSON_BUCKET_NAME=tarotea-content` for the Vercel Preview environment. The server reads the existing catalogue, word and sentence JSON from R2 using its account credentials. It signs individual recordings for 60 seconds. Keep the existing object keys and configure bucket CORS for audio GET requests from the app origins that use pronunciation analysis.

1. Deploy the access-control branch to Preview. Check the word lists, a free lesson, a locked tile, sentence practice, and both recording voices. Verify guests receive 401 for a locked lesson, a signed-in account without an unlock receives 403, and paid users and TaroKey buyers can open it.
2. After preview verification, set the same bucket variable for Production and deploy the tested commit. Verify the production app before changing public bucket access.
3. Close public access to the bucket across its custom domains and R2 development URL. Account for any other consumers of those domains first. Invalidate previous public lesson files and recordings on the CDN and old lesson pages, API responses and sentence feeds on Vercel. Check that anonymous origin requests for previously published files are denied, and repeat the app access checks.
