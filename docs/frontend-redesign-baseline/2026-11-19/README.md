# Frontend redesign baseline — 2026-11-19

This is the Step 0 visual, performance and accessibility baseline for the
incremental TaroTea frontend redesign.

## Capture details

- Source: live production at `https://www.tarotea.co.uk`
- Repository baseline: `main` at `03689943` (`add mobile bottom bar`)
- Authentication state: logged out
- Mobile viewport: 390 × 844, iPhone device scale
- Desktop viewport: 1440 × 1000
- Browser: Playwright Chromium 151
- Lighthouse: 13.6.0, one lab run per route

Lighthouse results are directional lab measurements, not production field
data. Future steps should use the same routes and settings for comparison.

Authenticated Account and Stats screens were not captured because Step 0 did
not use or request user credentials. They remain required for the relevant
authenticated preview review.

## Screenshot index

| Route | Mobile | Desktop |
| --- | --- | --- |
| Home `/` | [mobile](./home-mobile.png) | [desktop](./home-desktop.png) |
| Levels `/levels` | [mobile](./levels-mobile.png) | [desktop](./levels-desktop.png) |
| Topics `/topics` | [mobile](./topics-mobile.png) | [desktop](./topics-desktop.png) |
| Level quiz selection `/quiz` | [mobile](./quiz-selection-mobile.png) | [desktop](./quiz-selection-desktop.png) |
| Logged-out word access | [mobile](./topic-word-mobile.png) | [desktop](./topic-word-desktop.png) |
| Free quiz start | [mobile](./free-quiz-start-mobile.png) | [desktop](./free-quiz-start-desktop.png) |
| Active free quiz | [mobile](./free-quiz-mobile.png) | [desktop](./free-quiz-desktop.png) |

The requested word page correctly redirected a logged-out visitor to the word
unlock route. That unlock state is therefore the logged-out word-page baseline.

## Lighthouse baseline

| Route and form factor | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home, mobile | 62 | 100 | 81 | 92 | 1.0s | 1.0s | 5,930ms | 0 |
| Levels, mobile | 83 | 96 | 77 | 75 | 1.0s | 2.1s | 580ms | 0 |
| Topics, mobile | 66 | 100 | 81 | 83 | 1.0s | 1.0s | 7,480ms | 0 |
| Quiz selection, mobile | 61 | 91 | 81 | 75 | 1.1s | 1.1s | 8,260ms | 0 |
| Free quiz start, mobile | 92 | 95 | 81 | 67 | 1.0s | 1.0s | 290ms | 0 |
| Home, desktop | 83 | 100 | 81 | 92 | 0.3s | 0.3s | 360ms | 0 |
| Active free quiz, desktop | 74 | 94 | 81 | 75 | 0.2s | 0.2s | 420ms | 0.161 |

### Audit findings to carry forward

- Levels, quiz selection, free quiz start and active quiz do not provide a
  document title.
- Quiz selection uses a prohibited ARIA attribute.
- Levels logs a client hydration mismatch in both captured viewports.
- Most non-home routes do not provide a valid canonical URL.
- `robots.txt` is reported as invalid across the baseline.
- Lighthouse reports deprecated browser API use across all measured routes.
- The free quiz start page contains a link without descriptive text.
- Home, Topics and Quiz selection have very high mobile total blocking time.
- The active quiz has a measurable desktop layout shift (`0.161`).

SEO and application correctness issues should not be hidden inside visual
pull requests. They should either be fixed in a focused prerequisite change or
explicitly included in the acceptance criteria for the route being migrated.

## Visual implementation inventory

The current frontend contains:

- 88 Vue files across `pages` and `components`;
- 60 scoped component style blocks and 63 style-bearing Vue files overall;
- 598 direct six-digit hex colour occurrences representing 61 unique values;
- 494 rounded-corner utility occurrences;
- 251 shadow utility occurrences.

These counts do not make any one screen incorrect, but they demonstrate why a
central token and primitive layer is needed before route-by-route restyling.

## What should be preserved

- The warm blush canvas and recognisable pink, lilac, blue and yellow family.
- Large touch targets and straightforward card grids.
- Chinese text as the visual focus during learning activities.
- Lucide topic and level icons as helpful supporting cues.
- The simple four-answer quiz interaction.
- The new mobile bottom navigation concept, subject to Step 2 refinement.
- The generally calm, low-chrome character of the product.

## Primary visual findings

### 1. Hierarchy changes from route to route

Page headings, subheadings, back navigation, content widths and top spacing do
not follow a shared pattern. On mobile, some routes devote a large part of the
first viewport to empty space before the main task appears.

### 2. Colour is carrying too many jobs

Pastels currently act as category, decoration, button, card and status colours
at the same time. The palette remains valuable, but it needs semantic roles and
neutral surfaces so important actions can stand out.

### 3. Typography lacks a product hierarchy

The current interface uses the system sans-serif stack. Uppercase headings,
letter spacing, body copy and card titles vary substantially between routes.
Chinese text does not yet have an explicit Hong Kong Chinese font strategy.

### 4. Card treatments are inconsistent

Some screens use flat pastel tiles, others use white patterned cards, grey
panels, gradients or heavy rounded blocks. Radius, shadow, border and padding
choices are not communicating consistent elevation or interaction.

### 5. Desktop navigation is too hidden

The desktop header offers the wordmark and account menu while primary
navigation remains behind the bottom-left rocket. This creates substantial
unused header space and makes the application's main structure less obvious.

### 6. Active learning is not a distinct mode on mobile

The mobile bottom navigation remains visible during the active quiz, increasing
the chance of accidental exits. Topic quiz routes also highlight **Topics**
instead of **Quizzes**, so the location signal is incorrect.

### 7. Some supporting states feel disconnected from the brand

The logged-out word unlock screen uses a large neutral grey panel and verbose
instructional copy. It works functionally but does not share the visual
language of the browsing or quiz screens.

### 8. Desktop layouts can feel undersized

Several desktop routes place relatively small content in the centre of a wide
canvas without using the surrounding space to strengthen hierarchy, context or
navigation. This contributes to the unfinished feeling even where individual
cards are sound.

## Step 0 recommendation

Proceed with the proposed **warm learning studio** direction:

- preserve the palette but assign semantic colour roles;
- approve the darker plum interaction colour and neutral canvas/surface roles;
- test Manrope with Noto Sans HK during Step 1;
- establish tokens and primitives before changing product pages;
- treat mobile quiz focus mode and clearer desktop navigation as explicit shell
  requirements;
- preserve route behaviour and keep backend changes out of redesign pull
  requests.

## Approval required

Step 0 can be approved when these decisions are accepted:

1. Use the warm learning studio direction.
2. Retain the existing palette through semantic roles and add the proposed
   darker interaction colours.
3. Prototype Manrope + Noto Sans HK in Step 1, with final font approval based on
   a rendered preview.
4. Keep the mobile bottom navigation concept, but correct route highlighting
   and hide or minimise it during active quizzes.
5. Replace the hidden desktop rocket navigation during Step 2 with clearer
   primary navigation.

Approval of Step 0 authorises the design foundation in Step 1. It does not
approve route redesigns or production deployment of later steps.
