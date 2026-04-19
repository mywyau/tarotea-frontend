# Homepage Modern SaaS Plan

## Current gaps (from the existing homepage)

1. Hero is minimal (`Learn Cantonese`) and does not communicate outcomes, differentiation, or trust quickly.
2. No clear CTA hierarchy (e.g., Start Free vs Watch Demo vs Continue Learning).
3. Navigation tiles are useful, but they look like an internal dashboard rather than a conversion-first landing page.
4. No social proof beyond a single learner count; no testimonials, logos, or measurable outcomes.
5. No pricing/plan framing on the homepage to reduce upgrade uncertainty.
6. No focused "how it works" path for first-time visitors.

---

## Recommended homepage structure (modern SaaS)

## 1) Above-the-fold hero (highest priority)

- Headline with outcome + time-to-value.
  - Example: **"Speak practical Cantonese in 10 minutes a day."**
- Subheadline with product hook.
  - Example: **"Daily drills, sentence quizzes, and audio-first practice built for real-world Cantonese."**
- Primary CTA: **Start free**
- Secondary CTA: **See how it works**
- Tiny trust row below CTA:
  - learner count,
  - completion rate,
  - daily streaks completed.

## 2) Social proof + credibility strip

- Add 2–3 learner testimonials with concrete outcomes.
- Add a compact proof row:
  - "X learners"
  - "Y quizzes completed this week"
  - "Z daily sessions finished"

## 3) Product pillars (3 cards)

- **Daily consistency** (daily vocab + daily jyutping)
- **Structured growth** (levels + topics)
- **Performance feedback** (XP, streaks, weakest-word reinforcement)

Each card gets a "Try now" CTA to reduce decision friction.

## 4) "How it works" section (3 steps)

1. Choose your path (Daily / Levels / Topics)
2. Practice in short quizzes (audio + sentence comprehension)
3. Track progress and improve weak spots

Use simple visuals (UI screenshots or lightweight illustrations).

## 5) Conversion section (pricing + assurance)

- Add simple plan summary (Free vs Pro) with one clear upgrade CTA.
- Include short reassurance copy:
  - cancel anytime,
  - no surprise billing,
  - progress saved.

## 6) Returning-user fast lane

If logged in, show a contextual block above marketing content:

- "Continue where you left off"
- Next recommended action
- Daily streak status

This keeps homepage useful for both acquisition and retention.

---

## Copy upgrades that usually increase conversion

- Replace generic labels with action verbs:
  - "Topics" -> "Practice by Topic"
  - "Level Quiz" -> "Test My Level"
- Add benefit-first microcopy under each tile.
- Use one consistent CTA label everywhere (e.g., "Start free").

---

## UX/polish updates for modern SaaS feel

- Increase whitespace and section contrast.
- Add a sticky top CTA on desktop/mobile.
- Use iconography for each section to improve scanability.
- Add subtle motion on cards/CTAs (already partially present).
- Improve visual hierarchy in hero and section headings.

---

## Measurement plan (must-have)

Track these events:

- `homepage_cta_primary_click`
- `homepage_cta_secondary_click`
- `homepage_tile_click` (with tile id)
- `homepage_scroll_depth` (25/50/75/100)
- `signup_started_from_homepage`
- `upgrade_started_from_homepage`

Key KPIs:

- Visitor -> signup conversion rate
- Signup -> first quiz start
- Homepage CTA click-through rate
- Upgrade starts from homepage

---

## Suggested rollout (2 sprints)

### Sprint 1 (fast wins)
- New hero + CTA hierarchy
- Social proof strip
- Product pillars + how-it-works section
- Analytics events

### Sprint 2 (conversion optimization)
- Pricing/plan block
- Returning-user fast lane
- A/B test headline + CTA copy

---

## A/B tests to run first

1. Hero headline:
   - "Speak practical Cantonese in 10 minutes a day"
   - vs "Build Cantonese fluency with daily micro-practice"
2. CTA label:
   - "Start free"
   - vs "Start learning now"
3. First section after hero:
   - social proof first
   - vs product pillars first

---

## Implementation note

You can keep your current tile-based style and evolve it incrementally:

- keep the same color system,
- modernize hierarchy/copy,
- add conversion sections above the current dashboard tiles.

This avoids a full redesign while meaningfully improving SaaS conversion behavior.
