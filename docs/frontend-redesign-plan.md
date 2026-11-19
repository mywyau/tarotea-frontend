# TaroTea frontend redesign plan

Status: Step 0 approved; Step 1 implemented locally and awaiting preview review  
Owner: TaroTea  
Last updated: 2026-11-19

## Purpose

Give TaroTea a more polished, consistent and trustworthy interface while
retaining its friendly personality and recognisable pink, lilac, blue, blush
and yellow palette.

The work is deliberately split into small release steps. Each step must be
reviewed in a Vercel preview and explicitly approved before it is merged and
deployed. A later step must not be bundled into an earlier one without a new
approval.

## Product character

The proposed direction is a **warm learning studio**: calm enough for focused
study, friendly enough to feel encouraging, and structured enough to feel like
a mature product.

The interface should feel:

- clear before decorative;
- warm rather than clinical;
- playful in feedback, not in every surface;
- spacious but efficient on mobile;
- consistent across browsing, learning and account screens;
- distinctly TaroTea without relying on many simultaneous colours.

## What is creating inconsistency today

The application already has a likeable palette and several strong individual
screens. The main issue is that the visual rules are local rather than shared:

- brand colours are repeated directly across pages and components;
- Tailwind does not yet define the product's colour, type, spacing, radius or
  shadow tokens;
- similar cards and buttons use different radii, shadows and interaction
  states;
- page headings and content widths vary between sections;
- strong background colours sometimes compete with the content;
- animations are implemented page by page rather than following a motion
  policy;
- quiz screens and general browsing screens do not yet have clearly separate
  visual modes.

The redesign should solve these systemically instead of restyling every page
independently.

## Proposed visual foundation

### Colour roles

The existing colours remain part of the identity, but each receives a defined
job. Exact values can be tuned during Step 1 after contrast testing.

| Role | Proposed value | Use |
| --- | --- | --- |
| Canvas | `#FFFAFB` | Main application background |
| Surface | `#FFFFFF` | Cards, panels and menus |
| Ink | `#27212B` | Primary text and icons |
| Muted ink | `#716875` | Secondary text and metadata |
| Primary plum | `#87558D` | Primary buttons, links and focus states |
| Taro pink | `#EAB8E4` | Soft highlights and selected surfaces |
| Taro lilac | `#D6A3D1` | Secondary accent |
| Taro blue | `#A8CAE0` | Informational and practice accents |
| Taro blush | `#F6E1E1` | Warm background sections |
| Taro yellow | `#E9BD28` | Progress, streaks and small highlights |
| Success sage | `#78A276` | Correct answers and positive status |
| Error berry | `#B84F68` | Errors and destructive actions |

Pastel colours should normally appear as tints, borders, illustrations or
small accent areas. They should not all compete as equally strong card
backgrounds on the same screen.

### Typography

Proposed pairing:

- **Manrope** for Latin interface text and headings;
- **Noto Sans HK** as the preferred Chinese and Cantonese fallback;
- system sans-serif fallbacks while fonts load or when remote fonts are
  unavailable.

The type scale should have six named roles: display, page title, section title,
card title, body and caption. Tiny uppercase copy should be reserved for short
labels rather than explanatory text.

### Layout and surfaces

- Standard page widths: compact, reading and wide.
- Standard mobile page gutter: 20px, reducing to 16px only where space is
  constrained.
- Standard section rhythm based on an 8px spacing grid.
- Two principal card radii rather than page-specific values.
- One quiet default shadow and one elevated overlay shadow.
- Borders should define most cards; shadows should indicate real elevation.
- Interactive controls must have visible hover, active, focus and disabled
  states.

### Motion

- Motion should explain state changes or reward progress.
- Standard durations: 120ms for press/hover, 200ms for panels, and 300ms for
  intentional page moments.
- Avoid simultaneous entrance animations across large grids.
- Respect `prefers-reduced-motion` everywhere.

### Iconography and imagery

- Continue using Lucide icons with a consistent size and stroke policy.
- Use icons to clarify actions, not to decorate every label.
- A future TaroTea mark or illustration system can be explored separately; a
  logo redesign is not required for this programme.

## Reusable UI foundation

Step 1 should establish a small set of primitives before page work begins:

- `AppPage` or equivalent page-width and gutter treatment;
- `AppPageHeader`;
- `AppSection`;
- `AppCard` with restrained variants;
- `AppButton` with primary, secondary, quiet and destructive variants;
- `AppIconButton`;
- `AppBadge`;
- consistent form input, select, range and focus styles;
- loading, empty and error states;
- design tokens available to both Tailwind and component CSS.

Components should remain straightforward Vue components. A third-party UI
framework is not proposed.

## Delivery and approval workflow

Every step follows the same release path:

1. Confirm that step's scope and any open visual decisions.
2. Create a focused branch from the latest approved main branch.
3. Implement only the approved scope.
4. Run the production build and automated test suite.
5. Deploy a Vercel preview.
6. Review the stated desktop and mobile routes.
7. Record approval or requested changes in this document.
8. Merge and deploy only after approval.
9. Smoke-test production before starting the next step.

Each step should be one pull request where practical. No database migration,
content rewrite, entitlement change or API behaviour change should be included
in a visual redesign pull request.

## Redesign steps

### Step 0 — Baseline and visual decisions

Status: approved 2026-11-19

Scope:

- capture representative mobile and desktop screenshots;
- record current Lighthouse/accessibility results for the representative
  routes;
- confirm the warm learning studio direction;
- approve the palette roles and font pairing;
- identify any existing visual detail that must be preserved.

Representative routes:

- `/`;
- `/levels`;
- `/topics`;
- one level word page;
- one topic word page;
- one free vocabulary quiz start and active question page;
- `/account/v2` and `/stats/v2` when authenticated.

Approval gate:

- visual direction, palette and typography are approved before code changes to
  the design foundation.

### Step 1 — Design tokens and primitives

Status: implemented locally; awaiting preview review

Scope:

- introduce central colour, typography, radius, spacing, shadow and motion
  tokens;
- configure font loading and robust Chinese fallbacks;
- create the shared primitives listed above;
- add a development-only visual reference page or component tests for states;
- do not broadly restyle product pages yet.

Acceptance criteria:

- tokens have semantic names rather than page-specific names;
- all primitive states are keyboard accessible and contrast checked;
- no existing route or business behaviour changes;
- production build and full tests pass.

Rollback boundary: remove the new unused primitives and token imports.

### Step 2 — Application shell and navigation

Status: partially started; mobile bottom navigation exists but has not been
reviewed as part of the new design system

Scope:

- restyle the header, account menu, mobile bottom navigation and More drawer;
- redesign the footer;
- standardise global canvas, page gutters and safe-area behaviour;
- define when general navigation is hidden for focused learning flows;
- retain desktop and mobile route access.

Acceptance criteria:

- no content is hidden behind fixed navigation;
- active location is clear visually and to assistive technology;
- all destinations remain keyboard and touch accessible;
- mobile controls have at least 44px touch targets;
- the shell works at 320px through large desktop widths.

Rollback boundary: revert shell components without touching page content.

### Step 3 — Home page and first-use hierarchy

Status: not started

Scope:

- clarify the primary value proposition and first action;
- simplify competing cards and decorative treatments;
- provide a strong returning-user practice action;
- retain existing content, analytics and authentication behaviour unless a
  copy change is separately approved.

Acceptance criteria:

- one primary action is obvious above the fold;
- logged-in and logged-out states both have a complete hierarchy;
- no cumulative layout shift from user or stats loading;
- mobile reading order and tap targets are clear.

Rollback boundary: home-page presentation only.

### Step 4 — Browse and selection pages

Status: not started

Scope:

- redesign `/levels`, `/topics`, `/quiz`, `/topics/quiz`, `/dojo/level` and
  `/dojo/topic` using shared page, card and selector patterns;
- make locked, coming-soon, free and paid states visually consistent;
- standardise pagination and mode selection;
- reduce large-grid entrance animation.

Acceptance criteria:

- the same status looks the same across levels and topics;
- card grids remain readable at 320px without horizontal scrolling;
- colour is not the only status indicator;
- existing destination URLs and access rules are unchanged.

Rollback boundary: browse and selection routes only.

### Step 5 — Vocabulary lists and word pages

Status: not started

Scope:

- standardise word tiles and list progress indicators;
- redesign level and topic word-detail pages around the Chinese word, audio,
  Jyutping, meaning, examples and learning actions;
- unify audio controls and settings presentation;
- preserve deep links and word anchors.

Acceptance criteria:

- Chinese, Jyutping and English have an obvious reading hierarchy;
- audio controls remain reachable and understandable without colour alone;
- long examples and translations wrap cleanly;
- all existing learning actions remain available.

Rollback boundary: vocabulary components and word routes only.

### Step 6 — Quiz and practice focus mode

Status: not started

Scope:

- create a common quiz shell for vocabulary, audio and sentence quizzes;
- hide or minimise general navigation during an active question;
- standardise progress, prompts, answers, feedback and completion screens;
- retain distinct treatment for pronunciation and writing where their tasks
  genuinely differ;
- preserve current APIs, scoring, entitlements and persistence.

Acceptance criteria:

- accidental navigation during an active attempt is reduced;
- loading, correct, incorrect, retry and completion states are consistent;
- feedback does not depend only on red/green;
- keyboard and screen-reader quiz operation is maintained;
- free-tier quiz flows receive explicit regression testing.

Rollback boundary: shared quiz presentation and migrated quiz routes only;
quiz logic remains unchanged.

### Step 7 — Account, stats, upgrade and system states

Status: not started

Scope:

- apply the system to `/account/v2`, `/stats/v2` and `/upgrade`;
- standardise billing, authentication, empty, error and confirmation states;
- restyle legal and informational pages with the reading layout.

Acceptance criteria:

- plan and billing status are unambiguous;
- destructive actions are clearly separated and require existing confirmation;
- charts and progress summaries remain legible on mobile;
- authentication and billing behaviour are unchanged.

Rollback boundary: account and supporting presentation only.

### Step 8 — Consolidation and final QA

Status: not started

Scope:

- remove superseded styles and unused legacy components;
- replace remaining raw brand colours where semantic tokens apply;
- check route-wide responsive behaviour and accessibility;
- compare performance and bundle size with the Step 0 baseline;
- document the final component and token usage rules.

Acceptance criteria:

- no known page uses an obsolete shell or duplicate base component;
- no horizontal overflow on supported mobile widths;
- visible focus, reduced motion and contrast requirements pass;
- production build and full automated suite pass;
- critical journeys pass preview smoke tests.

Rollback boundary: cleanup must be separated into reviewable commits and must
not remove a legacy implementation until its replacement is live.

## Review matrix for every visual step

Test at minimum:

| Viewport | Purpose |
| --- | --- |
| 320px wide | Small supported phone and overflow check |
| 375–390px wide | Common phone layout |
| 768px wide | Tablet and responsive breakpoint |
| 1024px wide | Small desktop/laptop |
| 1440px wide | Large desktop and maximum-width behaviour |

Also verify:

- logged-out, free and paid states where relevant;
- keyboard-only navigation;
- visible focus indicators;
- reduced-motion mode;
- 200% browser zoom;
- long English, Chinese and Jyutping content;
- loading, empty, error and unavailable-content states;
- light-background contrast and colour-blind-safe status cues.

## Success measures

The redesign should improve measurable usability as well as appearance:

- fewer competing primary actions per screen;
- consistent navigation and component behaviour;
- no new accessibility regressions;
- no material regression in Core Web Vitals or JavaScript bundle size;
- fewer one-off CSS rules and duplicated visual values;
- successful completion of the main free and paid learning journeys on mobile;
- qualitative approval that the representative routes feel like one product.

## Out of scope unless separately approved

- backend architecture or API changes;
- authentication, payment or entitlement behaviour;
- changes to lesson content, translations or audio;
- a new logo, mascot or illustration commission;
- dark mode;
- native mobile applications;
- changing route URLs solely for visual reasons;
- adopting a third-party component framework.

## Decision log

| Decision | Status | Notes |
| --- | --- | --- |
| Warm learning studio direction | Approved | Retains warmth while reducing visual competition |
| Existing palette retained by role | Approved | Adds darker accessible interaction colours |
| Manrope + Noto Sans HK typography | Approved for prototype | Final rendering and asset cost reviewed in Step 1 preview |
| Incremental route migration | Approved | One approved preview and release at a time |
| Mobile bottom navigation | Approved for refinement | Review formally in Step 2 |
| Focus mode for active quizzes | Approved | General navigation hidden or minimised during attempts |
| Visible desktop primary navigation | Approved | Replace the hidden rocket navigation in Step 2 |

## Approval record

| Step | Preview | Approved by | Date | Notes |
| --- | --- | --- | --- | --- |
| 0 — Baseline and decisions | [baseline](./frontend-redesign-baseline/2026-11-19/README.md) | Product owner | 2026-11-19 | Approved in chat |
| 1 — Tokens and primitives | Local implementation | — | — | Awaiting preview review |
| 2 — Shell and navigation | — | — | — | Not started |
| 3 — Home | — | — | — | Not started |
| 4 — Browse and selection | — | — | — | Not started |
| 5 — Vocabulary and words | — | — | — | Not started |
| 6 — Quiz focus mode | — | — | — | Not started |
| 7 — Account and supporting pages | — | — | — | Not started |
| 8 — Consolidation and QA | — | — | — | Not started |
