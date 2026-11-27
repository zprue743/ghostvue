# Default theme

`@ghostvue/themes` provides an optional visual baseline for applications,
documentation, and playground examples. Component behavior never depends on it.

## Enable the theme

The easy path is the themed component, which loads the stylesheet and scopes
styles to that instance:

```vue
<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'
</script>

<template>
  <GhostButton>Save changes</GhostButton>
</template>
```

To style unstyled `@ghostvue/vue` buttons in a region, import the stylesheet and
apply `ghost-theme` only where the defaults should take effect:

```ts
import '@ghostvue/themes/default.css'
```

```vue
<template>
  <main class="ghost-theme">
    <GhostButton>Save changes</GhostButton>
  </main>
</template>
```

Buttons outside `.ghost-theme` and `.ghost-themed-scope` remain unstyled even when
the stylesheet is loaded. `.ghost-themed-scope` is a recipe scope only; token
values come from `.ghost-theme` / `[data-ghost-theme]`. This makes it possible to
compare the headless primitive with the default theme or nest a flagship around
themed wrappers.

## Opt-in theme CSS

Importing anything from `@ghostvue/themes` loads `default.css`: the default
palette, the shared base, and the recipe for every themed component. That is
the simplest setup, but an app that renders a few themed components still
ships every recipe. When CSS size matters, use the opt-in path instead: one
palette, the shared base, and only the recipes your app renders.

```html
<!-- index.html: the palette host is <html>, so parts that teleport to
     <body> (dialogs, drawers, menus, popovers, tooltips) inherit it. -->
<html lang="en" data-ghost-theme="calm"></html>
```

```ts
// main.ts
import { createApp } from 'vue'

// One palette: calm.css, vibrant.css, mono.css, or tokens.css (default).
import '@ghostvue/themes/calm.css'
// Shared base every recipe needs: wrapper scopes, elevation, materials,
// gradients, motion, and spotlight recipes.
import '@ghostvue/themes/base.css'
// One recipe per themed component family the app renders.
import '@ghostvue/themes/recipes/button.css'
import '@ghostvue/themes/recipes/dialog.css'
import '@ghostvue/themes/recipes/field.css'
import '@ghostvue/themes/recipes/input.css'

import App from './App.vue'

createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import {
  GhostButton,
  GhostDialog,
  GhostDialogContent,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes/components'
</script>

<template>
  <GhostField>
    <GhostFieldLabel>Workspace name</GhostFieldLabel>
    <GhostFieldControl v-slot="field">
      <GhostInput v-bind="field" />
    </GhostFieldControl>
  </GhostField>
  <GhostDialog>
    <GhostDialogTrigger :as="GhostButton">Rename</GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent>
      <GhostDialogTitle>Rename workspace</GhostDialogTitle>
    </GhostDialogContent>
  </GhostDialog>
</template>
```

`@ghostvue/themes/components` exports exactly the same components, composables,
and types as `@ghostvue/themes`. The only difference is that it never imports
`default.css`, so the stylesheets you list are the only theme CSS in the
build. Both paths use the same recipe files, so a component looks the same
either way.

- **Recipes.** `@ghostvue/themes/recipes/<family>.css` uses the component family
  name in kebab case: `GhostDropdownMenu` and its parts use
  `dropdown-menu.css`, and `GhostRadioGroupItem` uses `radio-group.css`.
  A component without a recipe stays unstyled; nothing fails at runtime.
- **Families that need two recipes.** `GhostDatePicker` renders the calendar
  recipe's parts, so import both `date-picker.css` and `calendar.css`.
  `GhostLink` with `appearance="button"` uses the button recipe, so import
  `button.css` as well as `link.css`. `GhostInteractiveSurface` needs only
  `base.css`.
- **Palette host.** Name the palette you imported with `data-ghost-theme`
  (for `tokens.css`, `class="ghost-theme"` or `data-ghost-theme="default"`).
  Put it on `<html>` or `<body>` when the app renders overlays: dialog,
  drawer, command palette, menu, popover, hover card, tooltip, select, and
  combobox content teleport to `<body>` by default, and a portaled part only
  gets palette tokens from an ancestor. To keep the host on an app wrapper,
  set the part's `portal-to` prop to an element inside that wrapper. The
  all-in setup follows the same rule. Light, dark, density, and nested modes
  work as in the all-in setup. To switch palettes at runtime, import each one
  you need.
- **Do not mix entries.** A single import from `@ghostvue/themes`, whether in
  your code or in a library you use, loads `default.css` again and removes the
  savings. Nuxt's themed auto-imports resolve to `@ghostvue/themes`, so they
  use the all-in setup.

In a production Vite build of the packed consumer fixture
(`pnpm consumer:packed`), with the calm palette, the all-in setup emits about
393 KB of CSS (27.7 KB gzip). The opt-in setup with the button, dialog,
field, and input recipes emits about 124 KB (9.0 KB gzip). Most of the opt-in CSS is the
palette itself; each recipe adds roughly 0.2 to 2 KB gzip.

## Button examples

Slot content still controls text and icons. Mark icon and loading-indicator
structure with `data-part`:

```vue
<GhostButton>
  <AddIcon data-part="icon" aria-hidden="true" />
  Add item
</GhostButton>

<GhostButton icon-only aria-label="Close dialog">
  <CloseIcon data-part="icon" aria-hidden="true" />
</GhostButton>

<GhostButton loading>Saving changes</GhostButton>

<GhostButton loading>
  <ProgressIcon data-part="loading-indicator" aria-hidden="true" />
  Publishing
</GhostButton>
```

`data-part="icon"` opts icon content into theme sizing. `iconOnly` (or
`data-icon-only` on the unstyled button) opts the control into a square
treatment while `aria-label` supplies the required accessible name. SVG
descendants of an explicitly marked icon wrapper fill that wrapper.

Loading overlays the preserved content, so the accessible name and button width
do not change. The default spinner is replaced when slot content provides a
decorative `data-part="loading-indicator"` element. Loading keeps the rest
fill and a wait cursor; disabled uses dedicated desaturated
`--ghost-action-disabled-*` colors (not a faded rest tone) and
`cursor: not-allowed`. Hover and press overlays are suppressed in both
cases. Loading remains focusable, so `:focus-visible` still draws the
two-tone ring.

## Variants, sizes, and layout

Themed visual props (or the matching data attributes on the unstyled button)
keep visual decisions off the headless API:

```vue
<GhostButton>Accent solid</GhostButton>
<GhostButton variant="soft" tone="neutral" size="sm">Neutral soft</GhostButton>
<GhostButton variant="outline">Accent outline</GhostButton>
<GhostButton variant="ghost" tone="danger">Danger ghost</GhostButton>
<GhostButton tone="danger">Danger solid</GhostButton>

<GhostButton size="sm">Small</GhostButton>
<GhostButton>Medium</GhostButton>
<GhostButton size="lg">Large</GhostButton>

<GhostButton block>Full-width action</GhostButton>
```

`variant` controls treatment independently from semantic color intent.
Supported values are `solid`, `soft`, `outline`, and `ghost`; omitting it selects
`solid`. `tone` accepts `accent`, `neutral`, and `danger`; omitting it selects
`accent`. Supported sizes are `sm`, `md`, and `lg`; omitting it selects `md`.

## Kbd examples

Themed `GhostKbd` uses elevation-0 keycaps and type/space sizes, not control
minimums. A slot-only instance is one keycap; a `keys` combination paints each
nested key instead.

```vue
<GhostKbd>F5</GhostKbd>
<GhostKbd :keys="['mod', 's']" />
<GhostKbd size="sm">Esc</GhostKbd>
```

Solid treatments paint `--ghost-gradient-action-primary`,
`--ghost-gradient-action-neutral`, or `--ghost-gradient-action-danger`
(restrained single-hue fills in `default`; multi-stop OKLCH gradients in
`vibrant`), an inset hairline bevel, and the elevation-1 shadow. Hover, press,
selected, and dragged are state-layer overlays (`--ghost-state-layer-*`) on the
current tone. Press scales to `--ghost-motion-press-scale` and drops to the
elevation-0 flush shadow, then releases with the snappy spring. The keyboard
focus ring is two-tone (`2px` width, `2px` offset) and eases in with
`--ghost-focus-ring-duration` (instant under reduced motion). Soft, outline,
and ghost rest fills use `--ghost-state-mix-*` instead of a gradient. The full
combination table lives on [GhostButton](../components/button.md#state-matrix).

## Light, dark, and nested modes

Unset `data-ghost-mode` follows `prefers-color-scheme`. Set `data-ghost-mode` on any
subtree to override the preference; nested attributes win. `.ghost-theme`
implies the `default` theme; `data-ghost-theme="default"` selects it on any
element. Flagship sheets (`calm`, `vibrant`, `mono`) match
`data-ghost-theme` only — see
[defineTheme and flagship themes](./define-theme.md).

```vue
<div class="ghost-theme">Uses the operating-system preference.</div>
<div class="ghost-theme" data-ghost-mode="dark">Forced dark.</div>
<div class="ghost-theme" data-ghost-mode="light">
  Forced light, even inside a dark ancestor.
</div>
```

The wrapper applies `--ghost-surface-bg` and `--ghost-surface-fg` and sets
`color-scheme` to `light dark` unless `data-ghost-mode` pins it. Transparent
outline and ghost treatments therefore always have a supported surface.

Themed instances inherit tokens from a `.ghost-theme` or `data-ghost-mode`
ancestor. They do not set `color-scheme` themselves, so a dark playground
region is not forced back to light.

## Customize tokens

Override semantic `--ghost-*` properties on the same wrapper or a nested theme
scope. GhostButton maps `tone="accent"` to `action.primary`, `neutral` to
`action.neutral`, and `danger` to `action.danger`. The full catalog is the
[token catalog](./tokens.md).

```css
.product-theme {
  --ghost-action-primary-bg: #7c3aed;
  --ghost-action-primary-fg: #ffffff;
  --ghost-action-primary-gradient-from: #7c3aed;
  --ghost-action-primary-gradient-to: #5b21b6;
  --ghost-state-layer-hover: 0.08;
  --ghost-focus-ring-color: #111827;
  --ghost-focus-ring-contrast: #ffffff;
  --ghost-action-radius: 999px;
  --ghost-control-size-md-min: 3rem;
  --ghost-control-size-md-padding-inline: 1.5rem;
}
```

Soft, outline, and ghost rest colors mix the selected action tone into
`--ghost-surface-bg` with `color-mix(in oklch, …)` using `--ghost-state-mix-*`.
Hover and press then apply the same state-layer overlay as solid, so
overriding a tone remains coherent across every treatment. Internal
`--_ghost-*` properties are implementation details and are not supported
theme APIs. `data-visual-state` is a docs/snapshot preview hook, not a
component prop.

Elevation, materials, and gradients are semantic `--ghost-*` variables plus
documented `data-elevation`, `data-material`, and `data-gradient` recipes.
See [elevation, materials, and gradients](./elevation.md). Motion durations,
easing, and springs are `--ghost-motion-*` plus `data-motion` recipes; see
[motion](./motion.md). Pointer spotlight is `--ghost-interactive-*` plus a
`data-interactive='spotlight'` recipe; see
[GhostInteractiveSurface](../components/interactive-surface.md). Density, type,
and roundness nest through `data-ghost-density` and `--ghost-roundness`; see
[density, type, and roundness](./density.md).

Authored DTCG lives in `packages/themes/tokens/` and is compiled by
`@ghostvue/themes` ([ADR 0007](../adr/0007-token-pipeline.md)).

## Icons

The theme ships no icon set and does not depend on an icon library
([ADR 0013](../adr/0013-icon-strategy.md)). Supply icons as slot content from
whatever set your application uses; headless components never choose artwork.

Themed defaults are CSS-painted, not icon assets: the GhostButton and
GhostSpinner loading rings, the GhostCheckbox check and indeterminate bar, and
the GhostRadioGroup dot. They follow the same tokens as your icons.

- **Color.** Icons inherit the control's text color when they paint with
  `currentColor` (`stroke="currentColor"` or `fill="currentColor"`), so tone,
  mode, disabled, and forced-colors styling apply without per-icon colors.
- **Size.** `--ghost-action-icon-size` (default `1.1em`) sizes
  `[data-part='icon']` in GhostButton and GhostBadge and the GhostLink
  `[data-part='external-icon']`; the inner `svg` fills that box.
  `--ghost-action-spinner-size` and `--ghost-action-spinner-width` size loading
  rings. Both are `em`-based, so icons follow density and text size.
- **Replacement.** Put your own markup in the documented slot. In a loading
  GhostButton, an element with `data-part="loading-indicator"` replaces the
  default ring; GhostLink's `externalIndicator` slot replaces its arrow.

```css
.product-theme {
  --ghost-action-icon-size: 1.25em;
  --ghost-action-spinner-width: 3px;
}
```

```vue
<GhostButton icon-only aria-label="Close dialog">
  <svg data-part="icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">
    <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" />
  </svg>
</GhostButton>
```

Decorative icons need `aria-hidden="true"`. An icon never names a control:
icon-only controls need `aria-label`, `aria-labelledby`, or
`GhostVisuallyHidden` text. `icon-only` changes sizing only.

## Accessibility and motion

The defaults include contrast-tested light and dark treatments (WCAG 2 AA
is gated in `pnpm contrast`, including each solid gradient end stop against
its `*.fg`; APCA Lc is advisory), a two-color keyboard focus indicator
with a short entrance, density-aware control sizes with a 44px
coarse-pointer floor, disabled and loading cursors, and reduced-motion
handling that keeps short color and opacity feedback, drops press scale,
and makes the focus ring instant.

Light and dark use two strategies. Unset `data-ghost-mode` follows
`prefers-color-scheme` from CSS alone, so server rendering does not flash the
opposite palette; `data-ghost-mode="light"` or `"dark"` pins a subtree (see
[Light, dark, and nested modes](#light-dark-and-nested-modes)).

In forced colors (Windows High Contrast), tokens map to system colors and
shadows, gradients, and glass drop away. Themed components keep every state
visible: checked, selected, active, and current indicators (checkbox, radio,
switch, tabs, tree, select and combobox options, calendar days, the current
page) paint `Highlight` with `HighlightText`, disabled parts use `GrayText`,
and focus rings are system-color outlines. If you restyle one of these
states, check it with forced colors emulated (Chromium DevTools > Rendering >
"Emulate CSS media feature forced-colors"). Applications remain
responsible for testing token overrides for contrast, focus visibility,
zoom, and target size in their full interface.

`startThemeTransition(element, mode)` is an optional helper that crossfades
`data-ghost-mode` with the View Transitions API when it exists and reduced
motion is not requested. This is a new public export.

## Override classes directly

The stylesheet is published in the low-priority `ghostvue-theme` cascade layer,
and its selectors use zero-specificity `:where()`. Ordinary unlayered consumer
styles therefore win even when imported before the theme:

```css
.product-button {
  background-color: rebeccapurple;
  border-radius: 999px;
}
```
