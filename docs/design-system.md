# TaroTea design foundation

Status: Step 1 implemented locally; awaiting preview approval  
Direction: warm learning studio

This document describes the additive design foundation introduced in Step 1 of
the [frontend redesign plan](./frontend-redesign-plan.md). Existing routes have
not been migrated to these primitives yet.

## Principles

- Use semantic roles instead of choosing a raw brand colour per screen.
- Make content hierarchy clear before adding decoration.
- Use pastel colour for identity, grouping and feedback rather than for every
  surface simultaneously.
- Keep focus states, touch targets and reduced motion part of the component
  contract.
- Preserve route behaviour while presentation is migrated incrementally.

## Token sources

- CSS variables and base interaction rules:
  `assets/css/theme.css`
- Tailwind semantic aliases:
  `tailwind.config.ts`
- Font resolution and self-hosted build assets:
  `nuxt.config.ts`

The CSS variables contain the actual values. Tailwind aliases reference those
variables so utility classes and component CSS share one source of truth.

## Typography prototype

The proposed stack is:

1. Manrope for interface and Latin text;
2. Noto Sans HK for Chinese text;
3. PingFang HK and Microsoft JhengHei as local fallbacks;
4. generic sans-serif fallback.

The stack is available through `font-brand`, `font-chinese`, `--font-brand`
and `--font-chinese`. It is not yet forced onto existing product pages. Manrope
is self-hosted by Nuxt Fonts, with preload disabled until route-level usage and
performance are understood.

Noto Sans HK remains the preferred Chinese face in the stack, but is currently
resolved locally before falling back to the platform's Hong Kong Chinese font.
Bundling four Noto Sans HK weights produced 123 font files totalling 22 MB in a
production build, so remote self-hosting is deferred until we can subset it to
the characters and weights used by each migrated route. The final Manrope-only
production output is 10 font files totalling approximately 244 KB.

## Semantic utilities

Examples:

```html
<div class="bg-app-canvas text-app-ink">
  <p class="text-app-muted">Secondary text</p>
  <button class="bg-app-primary text-white">Continue</button>
</div>
```

Available colour roles include `app-canvas`, `app-surface`, `app-ink`,
`app-muted`, `app-primary`, `app-primary-strong`, the five `taro-*` accents,
`app-success` and `app-error`.

Layout aliases include `max-w-compact`, `max-w-reading`, `max-w-wide`,
`px-gutter`, `rounded-control`, `rounded-card`, `rounded-panel`, `shadow-soft`
and `shadow-overlay`.

## Components

### Layout

- `AppPage`: standard page width, responsive gutter and vertical spacing.
- `AppPageHeader`: eyebrow, page title, description and actions.
- `AppSection`: consistent section title, description, actions and rhythm.

### Surfaces and controls

- `AppCard`: semantic surface tone, padding and optional elevation.
- `AppButton`: button, internal link or external link with four variants.
- `AppIconButton`: labelled square action built on `AppButton`.
- `AppBadge`: status or category label that does not rely on colour alone.
- `AppStatusState`: loading, empty/neutral, success and error messaging.

### Forms

Use `app-form-label`, `app-form-control`, `app-form-hint` and
`app-form-error`. These establish common field sizing, borders, focus,
placeholder and disabled treatment without forcing form behaviour.

## Accessibility contract

- Interactive controls have a minimum height of 44px by default.
- Focus-visible uses a high-contrast double ring.
- Loading buttons expose `aria-busy` and become disabled.
- Disabled link-style buttons render as noninteractive elements.
- Icon buttons require a text label.
- Error states use an assertive live region; other statuses are polite.
- Reduced-motion mode shortens animation and transition durations globally.
- Semantic text colours are intended to meet WCAG AA on their assigned
  surfaces and must be rechecked when combined differently.

## Visual reference

`components/ui/AppDesignSystemPreview.vue` renders representative typography,
cards, buttons, fields, badges and system states. It is intentionally not a
public route and is not included in normal navigation. It can be mounted in a
temporary preview page or component harness during design review.

## Migration rule

A product page should only adopt these components during its approved redesign
step. Do not perform repository-wide mechanical replacement of raw colours or
card classes before the relevant route has visual approval.
