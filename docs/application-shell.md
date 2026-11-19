# TaroTea application shell

Status: Step 2 implemented locally; awaiting preview approval  
Direction: warm learning studio

This document records the navigation and application-shell contract introduced
in Step 2 of the [frontend redesign plan](./frontend-redesign-plan.md).

## Navigation hierarchy

- The brand returns home.
- Desktop primary navigation exposes Levels, Topics, Quizzes and Dojo. Daily is
  added for signed-in learners.
- The More drawer retains access to level and topic learning, both quiz
  selectors, both dojo selectors and signed-in daily activities.
- Account, stats, upgrade and authentication actions remain available through
  the account menu and the drawer account section.
- Mobile primary navigation remains Home, Levels, Topics, Quizzes and More.

The former desktop rocket control has been removed. Active destinations use
both visual treatment and `aria-current="page"`.

## Focus mode

Active quizzes, dojo training, writing exercises and echo activities use a
reduced shell. It keeps the TaroTea brand and a deterministic Exit practice
action while removing the bottom navigation, general navigation, back row and
footer.

Quiz introduction and start screens retain the full shell. Route detection is
centralised in `utils/navigation/focusMode.ts` so it can be tested independently
and extended as new exercise routes are added.

Exit practice destinations are stable selection screens rather than browser
history:

- level quiz → `/quiz`;
- topic quiz → `/topics/quiz`;
- level dojo → `/dojo/level`;
- topic dojo → `/dojo/topic`;
- other focused activities → `/`.

## Accessibility and responsive behaviour

- Header and mobile navigation controls meet the 44px touch-target baseline.
- The More drawer is an identified modal dialog, closes with Escape, traps Tab
  focus and restores focus to its trigger.
- Opening the drawer prevents background scrolling.
- Mobile safe-area padding is applied to the fixed navigation and drawer.
- The bottom bar is rendered outside the blurred sticky header so it remains
  fixed to the viewport rather than the header containing block.
- The shell is designed for 320px through wide desktop layouts.

## Migration boundary

Step 2 changes the shared shell only. Existing route content and business logic
remain untouched. Page-specific hierarchy and presentation begin in Step 3.
