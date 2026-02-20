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
- 🗑️ Full account deletion with data + billing cleanup

---

## Tech Stack

- **Frontend:** Nuxt 3 + Vue + Tailwind
- **Backend:** Nuxt server routes (Nitro)
- **Auth:** Auth0 (JWT-based)
- **Billing:** Stripe Checkout + Billing Portal
- **Database:** PostgreSQL (Supabase)
- **CDN:** JSON + audio served from CDN

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

## Status

🚧 Actively developed  
This project is evolving and features may change.

---

## Philosophy

- Keep the app simple and calm
- Teach natural Cantonese, not textbook grammar
- Respect user data — no dark patterns, easy deletion


### Clear build

```
rm -rf .nuxt
rm -rf node_modules
rm -rf .output
```

### Install dependencies
```
npm install
```

### Run dev build
```
npm run build
```

### Run dev build
```
npm run dev
```

### Run preview prod
```
npm run preview
```
