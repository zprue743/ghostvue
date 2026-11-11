# Default theme

`@slop-ui/themes` provides an optional visual baseline for applications,
documentation, and playground examples. Component behavior never depends on it.

## Enable the theme

The easy path is the themed component, which loads the stylesheet and scopes
styles to that instance:

```vue
<script setup lang="ts">
import { SlButton } from '@slop-ui/themes'
</script>

<template>
  <SlButton>Save changes</SlButton>
</template>
```

To style unstyled `@slop-ui/vue` buttons in a region, import the stylesheet and
apply `slop-theme` only where the defaults should take effect:

```ts
import '@slop-ui/themes/default.css'
```

```vue
<template>
  <main class="slop-theme">
    <SlButton>Save changes</SlButton>
  </main>
</template>
```

Buttons outside `.slop-theme` and `.slop-themed-scope` remain unstyled even when
the stylesheet is loaded. This makes it possible to compare the headless
primitive with the default theme or combine slop-ui with another design system
incrementally.

## Button examples

Slot content still controls text and icons. Mark icon and loading-indicator
structure with `data-part`:

```vue
<SlButton>
  <AddIcon data-part="icon" aria-hidden="true" />
  Add item
</SlButton>

<SlButton icon-only aria-label="Close dialog">
  <CloseIcon data-part="icon" aria-hidden="true" />
</SlButton>

<SlButton loading>Saving changes</SlButton>

<SlButton loading>
  <ProgressIcon data-part="loading-indicator" aria-hidden="true" />
  Publishing
</SlButton>
```

`data-part="icon"` opts icon content into theme sizing. `iconOnly` (or
`data-icon-only` on the unstyled button) opts the control into a square
treatment while `aria-label` supplies the required accessible name. SVG
descendants of an explicitly marked icon wrapper fill that wrapper.

Loading overlays the preserved content, so the accessible name and button width
do not change. The default spinner is replaced when slot content provides a
decorative `data-part="loading-indicator"` element. Loading keeps the rest
fill and a wait cursor; disabled uses dedicated desaturated
`--sl-action-disabled-*` colors (not a faded rest tone) and
`cursor: not-allowed`. Hover and press overlays are suppressed in both
cases. Loading remains focusable, so `:focus-visible` still draws the
two-tone ring.

## Variants, sizes, and layout

Themed visual props (or the matching data attributes on the unstyled button)
keep visual decisions off the headless API:

```vue
<SlButton>Accent solid</SlButton>
<SlButton variant="soft" tone="neutral" size="sm">Neutral soft</SlButton>
<SlButton variant="outline">Accent outline</SlButton>
<SlButton variant="ghost" tone="danger">Danger ghost</SlButton>
<SlButton tone="danger">Danger solid</SlButton>

<SlButton size="sm">Small</SlButton>
<SlButton>Medium</SlButton>
<SlButton size="lg">Large</SlButton>

<SlButton block>Full-width action</SlButton>
```

`variant` controls treatment independently from semantic color intent.
Supported values are `solid`, `soft`, `outline`, and `ghost`; omitting it selects
`solid`. `tone` accepts `accent`, `neutral`, and `danger`; omitting it selects
`accent`. Supported sizes are `sm`, `md`, and `lg`; omitting it selects `md`.

Solid treatments paint an oklch gradient (`--sl-gradient-action-primary`,
`--sl-gradient-action-neutral`, `--sl-gradient-action-danger`), an inset
highlight, and the elevation-2 shadow. Hover, press, selected, and dragged
are state-layer overlays (`--sl-state-layer-*`) on the current tone. Press
scales to `--sl-motion-press-scale` and drops to the elevation-1 shadow,
then releases with the snappy spring. The keyboard focus ring is two-tone
and eases in with `--sl-focus-ring-duration` (instant under reduced
motion). Soft, outline, and ghost rest fills use `--sl-state-mix-*` instead
of a gradient. The full combination table lives on
[SlButton](../components/button.md#state-matrix).

## Light, dark, and nested modes

Unset `data-sl-mode` follows `prefers-color-scheme`. Set `data-sl-mode` on any
subtree to override the preference; nested attributes win. `.slop-theme`
implies the `default` theme; `data-sl-theme="default"` selects it on any
element.

```vue
<div class="slop-theme">Uses the operating-system preference.</div>
<div class="slop-theme" data-sl-mode="dark">Forced dark.</div>
<div class="slop-theme" data-sl-mode="light">
  Forced light, even inside a dark ancestor.
</div>
```

The wrapper applies `--sl-surface-bg` and `--sl-surface-fg` and sets
`color-scheme` to `light dark` unless `data-sl-mode` pins it. Transparent
outline and ghost treatments therefore always have a supported surface.

Themed instances inherit tokens from a `.slop-theme` or `data-sl-mode`
ancestor. They do not set `color-scheme` themselves, so a dark playground
region is not forced back to light.

## Customize tokens

Override semantic `--sl-*` properties on the same wrapper or a nested theme
scope. SlButton maps `tone="accent"` to `action.primary`, `neutral` to
`action.neutral`, and `danger` to `action.danger`. The full catalog is the
[token catalog](./tokens.md).

```css
.product-theme {
  --sl-action-primary-bg: #7c3aed;
  --sl-action-primary-fg: #ffffff;
  --sl-action-primary-gradient-from: #7c3aed;
  --sl-action-primary-gradient-to: #5b21b6;
  --sl-state-layer-hover: 0.08;
  --sl-focus-ring-color: #111827;
  --sl-focus-ring-contrast: #ffffff;
  --sl-action-radius: 999px;
  --sl-control-size-md-min: 3rem;
  --sl-control-size-md-padding-inline: 1.5rem;
}
```

Soft, outline, and ghost rest colors mix the selected action tone into
`--sl-surface-bg` with `color-mix(in oklch, …)` using `--sl-state-mix-*`.
Hover and press then apply the same state-layer overlay as solid, so
overriding a tone remains coherent across every treatment. Internal
`--_slop-*` properties are implementation details and are not supported
theme APIs. `data-visual-state` is a docs/snapshot preview hook, not a
component prop.

Elevation, materials, and gradients are semantic `--sl-*` variables plus
documented `data-elevation`, `data-material`, and `data-gradient` recipes.
See [elevation, materials, and gradients](./elevation.md). Motion durations,
easing, and springs are `--sl-motion-*` plus `data-motion` recipes; see
[motion](./motion.md). Density, type, and roundness nest through
`data-sl-density` and `--sl-roundness`; see
[density, type, and roundness](./density.md).

Authored DTCG lives in `packages/themes/tokens/` and is compiled by
`@slop-ui/themes` ([ADR 0007](../adr/0007-token-pipeline.md)).

## Accessibility and motion

The defaults include contrast-tested light and dark treatments (WCAG 2 AA
is gated in `pnpm contrast`, including each solid gradient end stop against
its `*.fg`; APCA Lc is advisory), a two-color keyboard focus indicator
with a short entrance, density-aware control sizes with a 44px
coarse-pointer floor, forced-colors mapping to system colors, disabled
and loading cursors, and reduced-motion handling that keeps short color
and opacity feedback, drops press scale, and makes the focus ring instant.
Unset `data-sl-mode` follows `prefers-color-scheme` from CSS alone, so
server rendering does not flash the opposite palette. Applications remain
responsible for testing token overrides for contrast, focus visibility,
zoom, and target size in their full interface.

`startThemeTransition(element, mode)` is an optional helper that crossfades
`data-sl-mode` with the View Transitions API when it exists and reduced
motion is not requested. This is a new public export.

## Override classes directly

The stylesheet is published in the low-priority `slop-ui-theme` cascade layer,
and its selectors use zero-specificity `:where()`. Ordinary unlayered consumer
styles therefore win even when imported before the theme:

```css
.product-button {
  background-color: rebeccapurple;
  border-radius: 999px;
}
```
