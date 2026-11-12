<script setup>
import { ref } from 'vue'

import '@ghostvue/themes/default.css'
import { GhostButton } from '../../packages/themes/src/ghost-button'

const density = ref('comfortable')
const roundness = ref(1)
</script>

# Density, type, and roundness

SLO-66 recipes on top of the [token catalog](./tokens.md). Components consume
semantic `--ghost-*` variables. There are no per-component tokens.

Unset `data-ghost-density` is **comfortable**. `data-ghost-density` nests on any
subtree the same way `data-ghost-mode` does: a descendant attribute overrides
the ancestor. `--ghost-roundness` (0–1, default 1) is a CSS custom property on
any subtree; every radius token is `calc(<designed> * var(--ghost-roundness, 1))`.

## Spacing

The primitive scale is 4px (`0`, `1` = 4px, `2` = 8px, through `16` = 64px).
Semantic roles are `space.gap.*`, `space.inset.*`, and `space.stack.*`.
Density remaps those roles one step down (compact) or up (spacious).

## Control heights

Heights are the five-step scale 28 / 32 / 36 / 40 / 48px. Size and density
map onto that scale:

| Size | compact | comfortable (default) | spacious |
| ---- | ------- | --------------------- | -------- |
| sm   | 28px    | 32px                  | 36px     |
| md   | 32px    | 40px                  | 48px     |
| lg   | 40px    | 48px                  | 48px     |

Comfortable is 4px below the previous GhostButton snapshot (36 / 44 / 52).
`@media (pointer: coarse)` floors every control minimum to 44px
(`control.touch`, 2.75rem) so touch targets do not shrink with compact or
small sizes. Fine pointers keep the mapped height.

Radius follows the same density step: compact is one step tighter,
spacious one step rounder, then multiplied by `--ghost-roundness`.

## Type

Fluid `clamp()` sizes from 320px–1280px viewports. The stack is system UI
only (`ui-sans-serif, system-ui, sans-serif` plus emoji fallbacks). No web
font.

| Token                  | CSS                            | Use                    |
| ---------------------- | ------------------------------ | ---------------------- |
| `type.family.sans`     | `--ghost-type-family-sans`     | System sans            |
| `type.size.sm`–`3xl`   | `--ghost-type-size-*`          | Fluid type scale       |
| `type.letter.tight`    | `--ghost-type-letter-tight`    | `-0.02em`              |
| `type.letter.normal`   | `--ghost-type-letter-normal`   | `0em`                  |
| `type.letter.wide`     | `--ghost-type-letter-wide`     | `0.04em`               |
| `type.numeric.tabular` | `--ghost-type-numeric-tabular` | `font-variant-numeric` |
| `type.feature.default` | `--ghost-type-feature-default` | kern / liga / calt     |
| `type.feature.tabular` | `--ghost-type-feature-tabular` | `tnum` plus kerning    |

```css
.price {
  font-variant-numeric: var(--ghost-type-numeric-tabular);
  font-feature-settings: var(--ghost-type-feature-tabular);
}
```

Type does not change with density. GhostButton maps `sm` / `md` / `lg` onto
`control.size.*.font` (fluid sm / md / lg).

## Roundness

```css
.product-theme {
  --ghost-roundness: 0.35;
}

.chip {
  border-radius: var(--ghost-radius-pill);
}
```

| `--ghost-roundness` | Effect                                       |
| ------------------- | -------------------------------------------- |
| `0`                 | Sharp. Every radius token computes to `0`.   |
| `1` (default)       | Designed radii. `radius.pill` is a capsule.  |
| between             | Linear scale of each token’s designed value. |

Set the knob on any subtree. Radius `calc()` is redeclared on descendants so
a nested `--ghost-roundness` re-evaluates, matching `--ghost-motion-intensity`.

## Live demo

Density and roundness on this card. Nested `data-ghost-density` inside a
comfortable page still wins.

<div class="ghost-theme demo-board" data-ghost-mode="light">
  <p>
    <label>
      Density
      <select v-model="density">
        <option value="compact">compact</option>
        <option value="comfortable">comfortable</option>
        <option value="spacious">spacious</option>
      </select>
    </label>
    <label>
      Roundness {{ roundness }}
      <input v-model.number="roundness" type="range" min="0" max="1" step="0.05" />
    </label>
  </p>
  <div
    class="demo-row"
    :data-ghost-density="density"
    :style="{ '--ghost-roundness': String(roundness) }"
  >
    <GhostButton size="sm">Small</GhostButton>
    <GhostButton>Medium</GhostButton>
    <GhostButton size="lg">Large</GhostButton>
    <GhostButton variant="outline">Outline</GhostButton>
  </div>
  <p class="demo-type">
    <span class="demo-xs">xs</span>
    <span class="demo-md">Body uses fluid <code>type.size.md</code>.</span>
    <span class="demo-tabular">12,345.00</span>
  </p>
</div>

## Playground

The playground Density, type, and roundness section has the same controls plus
a matrix of every density × roundness `0` / `0.5` / `1` used by browser
snapshots.

<style>
.demo-board {
  border-radius: 1rem;
  margin: 1rem 0 1.5rem;
  padding: 1rem;
}
.demo-board label {
  display: inline-flex;
  gap: 0.4rem;
  margin-inline-end: 1rem;
}
.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-md, 0.75rem);
}
.demo-type {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  font-family: var(--ghost-type-family-sans);
  gap: 1rem;
  margin-block-start: 1rem;
}
.demo-xs {
  font-size: var(--ghost-type-size-xs);
}
.demo-md {
  font-size: var(--ghost-type-size-md);
}
.demo-tabular {
  font-feature-settings: var(--ghost-type-feature-tabular);
  font-size: var(--ghost-type-size-lg);
  font-variant-numeric: var(--ghost-type-numeric-tabular);
  letter-spacing: var(--ghost-type-letter-tight);
}
</style>
