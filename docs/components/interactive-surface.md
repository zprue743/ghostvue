<script setup lang="ts">
import { GhostButton, GhostInteractiveSurface } from '@ghostvue/themes'
import '@ghostvue/themes/default.css'
</script>

# GhostInteractiveSurface

Pointer spotlight for surfaces that should notice the cursor. Import the
unstyled primitive from `@ghostvue/vue`, or the themed wrapper from
`@ghostvue/themes`. v1 is **spotlight only**; tilt and magnetic are
follow-ups. See [ADR 0009](../adr/0009-ambient-interactivity.md).

## Basic use

```vue
<script setup lang="ts">
import { GhostInteractiveSurface } from '@ghostvue/themes'
</script>

<template>
  <GhostInteractiveSurface>
    <h3>Quarterly report</h3>
    <p>The glow follows the pointer. Copy stays readable without it.</p>
  </GhostInteractiveSurface>
</template>
```

<div class="ghost-theme demo-board" data-ghost-mode="light">
  <GhostInteractiveSurface class="demo-card" data-elevation="2">
    <h3 class="demo-title">Quarterly report</h3>
    <p class="demo-copy">Move the pointer across this card. The glow is decoration.</p>
  </GhostInteractiveSurface>
  <p>
    <GhostButton interactive="spotlight">Save changes</GhostButton>
  </p>
</div>

Headless use of the same contract without the SFC:

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useGhostInteractiveSurface } from '@ghostvue/vue'

const host = useTemplateRef<HTMLElement>('host')
const { rootProps } = useGhostInteractiveSurface(host)
</script>

<template>
  <article ref="host" v-bind="rootProps">
    <span data-part="glow" aria-hidden="true" />
    <slot />
  </article>
</template>
```

## API

| Prop      | Type                                         | Default         | Description                                             |
| --------- | -------------------------------------------- | --------------- | ------------------------------------------------------- |
| `as`      | `'div' \| 'article' \| 'section' \| 'aside'` | `'div'`         | Root tag.                                               |
| `effects` | `InteractiveEffect[]`                        | `['spotlight']` | Recipes on `data-interactive`. v1 supports `spotlight`. |

`InteractiveEffect` is `'spotlight'`. Native attributes fall through to the
root. The default slot is the content. A template ref exposes `element`.

`useGhostInteractiveSurface(target, options?)` also accepts `stateAttribute`
(`'data-state'` or `'data-interactive-state'`) for hosts that already own
`data-state`. It writes `--ghost-pointer-x` / `--ghost-pointer-y` (px) and
unitless `--ghost-pointer-nx` / `--ghost-pointer-ny` on the host.

## Themed GhostButton opt-in

Themed `GhostButton` stays inert unless you pass `interactive="spotlight"`.
Off by default — existing screenshots do not change.

```vue
<GhostButton interactive="spotlight">Save changes</GhostButton>
```

That sets `data-interactive="spotlight"` and tracks on
`data-interactive-state` so loading and disabled keep `data-state`.

## Theme knob

`defineTheme({ interactivity: 'none' | 'subtle' | 'expressive' })` maps onto
`interactive.spotlight.size` and `interactive.spotlight.opacity`. The
authored default is **subtle** (`10rem` / `0.28`). **none** zeros the glow.
**expressive** enlarges it (`20rem` / `0.75`). Flagships: calm and mono use
subtle (mono’s chroma-0 primary is the hairline color); vibrant uses
expressive.

## Styling

Recipes key off `data-interactive~='spotlight'` and `data-part="glow"`.
Peak opacity is
`calc(var(--ghost-interactive-spotlight-opacity) * var(--ghost-motion-intensity, 1))`.
Leave settles with `--ghost-interactive-leave-spring`. Forced colors and
`prefers-reduced-motion: reduce` drop the glow. Coarse pointers never
track.

One active tracking surface is the expected case. The library does not
enforce a singleton.

## Accessibility and environment behavior

Spotlight is decoration. Reduced motion and coarse pointers are fully off.
SSR markup is `data-state="off"`; capable surfaces become `idle` after
mount. Setup does not read browser globals.

See the [approved specification](./interactive-surface-spec.md).

<style>
.demo-board {
  border-radius: var(--ghost-radius-lg);
  display: grid;
  gap: var(--ghost-space-stack-md);
  margin-block: var(--ghost-space-stack-md);
  padding: var(--ghost-space-inset-md);
}
.demo-card {
  min-block-size: 8rem;
  padding: var(--ghost-space-inset-md);
}
.demo-title,
.demo-copy {
  margin: 0;
}
.demo-copy {
  color: var(--ghost-text-muted);
}
</style>
