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

## Light, dark, and system color schemes

The `.slop-theme` wrapper uses a light scheme. Select dark explicitly or follow
the operating-system preference:

```vue
<div class="slop-theme" data-color-scheme="dark">...</div>
<div class="slop-theme" data-color-scheme="system">...</div>
```

The wrapper defines and applies `--slop-theme-surface` and
`--slop-theme-color`, in addition to setting the CSS `color-scheme` property.
Transparent outline and ghost treatments therefore always have a supported
surface. The `system` mode selects the light or dark token values using the
operating-system preference.

Themed instances inherit `color-scheme` from a `.slop-theme` ancestor when one
is present. They do not set `color-scheme` themselves, so a dark playground
region is not forced back to light.

## Customize tokens

The initial token surface is deliberately Button-specific. Override tokens on
the same wrapper or a nested theme scope:

```css
.product-theme {
  --slop-button-accent-color: #7c3aed;
  --slop-button-accent-color-hover: #6d28d9;
  --slop-button-accent-color-active: #5b21b6;
  --slop-button-accent-contrast: #ffffff;
  --slop-button-focus-ring: #111827;
  --slop-button-focus-ring-contrast: #ffffff;
  --slop-button-radius: 999px;
  --slop-button-size-md-min-size: 3rem;
  --slop-button-size-md-padding-inline: 1.5rem;
}
```

### Supported token surface

| Tokens                                                                                | Purpose                                                                             |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `--slop-theme-surface`, `--slop-theme-color`                                          | Background and foreground applied to the theme scope.                               |
| `--slop-button-{tone}-color`                                                          | Solid background and outline/ghost foreground for `accent`, `neutral`, or `danger`. |
| `--slop-button-{tone}-color-hover`, `--slop-button-{tone}-color-active`               | Solid interaction colors for each tone.                                             |
| `--slop-button-{tone}-contrast`                                                       | Content color on the solid treatment for each tone.                                 |
| `--slop-button-disabled-opacity`                                                      | Shared unavailable-state opacity.                                                   |
| `--slop-button-focus-ring`, `--slop-button-focus-ring-contrast`                       | Two-color focus indicator.                                                          |
| `--slop-button-focus-ring-offset`, `--slop-button-focus-ring-width`                   | Focus indicator geometry.                                                           |
| `--slop-button-font-weight`, `--slop-button-gap`, `--slop-button-radius`              | Typography and layout defaults.                                                     |
| `--slop-button-icon-size`                                                             | Explicit icon-hook size.                                                            |
| `--slop-button-loading-indicator-size`, `--slop-button-loading-indicator-width`       | Default and custom loading-indicator geometry.                                      |
| `--slop-button-transition-duration`                                                   | Interaction transition duration.                                                    |
| `--slop-button-size-{size}-min-size`                                                  | Minimum block size for `sm`, `md`, or `lg`.                                         |
| `--slop-button-size-{size}-padding-block`, `--slop-button-size-{size}-padding-inline` | Padding for `sm`, `md`, or `lg`.                                                    |

The tone placeholders expand to `accent`, `neutral`, and `danger`; the size
placeholders expand to `sm`, `md`, and `lg`. Soft, outline, and ghost state
colors are derived from the selected tone and theme surface with `color-mix()`,
so overriding a tone remains coherent across every treatment. Internal
`--_slop-*` properties are implementation details and are not supported theme
APIs.

Component-scoped tokens avoid prematurely defining a global color or spacing
system. Shared tokens should be introduced only when later components
demonstrate a real common responsibility. The DTCG authoring pipeline is
accepted in [ADR 0005](../adr/0005-design-token-taxonomy.md) but is not built
yet; this CSS remains the runtime snapshot.

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
