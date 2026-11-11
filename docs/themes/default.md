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
decorative `data-part="loading-indicator"` element. Loading and disabled
appearances follow the component's semantic attributes.

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
  --sl-action-primary-bg-hover: #6d28d9;
  --sl-action-primary-bg-active: #5b21b6;
  --sl-action-primary-fg: #ffffff;
  --sl-focus-ring-color: #111827;
  --sl-focus-ring-contrast: #ffffff;
  --sl-action-radius: 999px;
  --sl-control-size-md-min: 3rem;
  --sl-control-size-md-padding-inline: 1.5rem;
}
```

Soft, outline, and ghost state colors are derived from the selected action
tone and `--sl-surface-bg` with `color-mix()`, so overriding a tone remains
coherent across every treatment. Internal `--_slop-*` properties are
implementation details and are not supported theme APIs.

Authored DTCG lives in `packages/themes/tokens/` and is compiled by
`@slop-ui/themes` ([ADR 0007](../adr/0007-token-pipeline.md)).

## Accessibility and motion

The defaults include contrast-tested light and dark treatments, a two-color
keyboard focus indicator, minimum control sizes, forced-colors support, disabled
and loading cursors, and reduced-motion handling. Applications remain responsible
for testing token overrides for contrast, focus visibility, zoom, and target size
in their full interface.

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
