<script setup>
import { ref } from 'vue'

import '@ghostvue/themes/default.css'
import { startThemeTransition } from '../../packages/themes/src/start-theme-transition'

const stage = ref(null)

async function crossfade(mode) {
  if (stage.value) await startThemeTransition(stage.value, mode)
}
</script>

# Motion

GHO-65 recipes on top of the [token catalog](./tokens.md). Components consume
semantic `--ghost-*` variables. `data-motion` attributes are documented utilities
in `@ghostvue/themes` default CSS. They are not per-component tokens.

Duration CSS values are `calc(<ms> * var(--ghost-motion-intensity, 1))`. Set
`--ghost-motion-intensity` (0–1, default 1) on any subtree to scale every
duration without rewriting each property. Modes still nest through
`data-ghost-mode`.

## Durations and easing

| Token                        | Use                                     |
| ---------------------------- | --------------------------------------- |
| `motion.duration.instant`    | Snap with no interpolation              |
| `motion.duration.fast`       | Color, opacity, and control transitions |
| `motion.duration.moderate`   | Default enter                           |
| `motion.duration.slow`       | Large surfaces                          |
| `motion.duration.expressive` | Emphasized / looping motion             |
| `motion.easing.standard`     | Symmetric default                       |
| `motion.easing.decelerate`   | Enters                                  |
| `motion.easing.accelerate`   | Exits                                   |

## Springs

`gentle`, `snappy`, and `bouncy` are authored as stiffness / damping / mass
and compiled to CSS `linear()` plus a settle duration
(`--ghost-motion-spring-gentle-duration`, and the same for snappy and bouncy).
Use the easing string as `animation-timing-function` or
`transition-timing-function`, and the settle duration as the duration.

## Choreography

- **Exits run faster than enters.** `motion.exit.duration` aliases fast;
  `motion.enter.duration` aliases moderate. Arrivals get time to land;
  departures get out of the way.
- **Stagger from the trigger.** Offset each item by `n * var(--ghost-motion-stagger)`.
  Under reduced motion stagger becomes 0 so the group appears together.
- **Animate from the trigger origin.** Set `transform-origin` (or
  `transform-box`) on the moving surface to the point that opened it — the
  button, the row, the caret — instead of the viewport center.

```css
.menu {
  transform-origin: var(--menu-origin, top left);
  transition:
    opacity var(--ghost-motion-enter-duration) var(--ghost-motion-enter-easing),
    transform var(--ghost-motion-enter-duration)
      var(--ghost-motion-enter-easing);
}

.menu[data-state='closed'] {
  opacity: 0;
  transform: translateY(var(--ghost-motion-translate))
    scale(var(--ghost-motion-scale));
  transition-duration: var(--ghost-motion-exit-duration);
  transition-timing-function: var(--ghost-motion-exit-easing);
}
```

Under `prefers-reduced-motion: reduce`, translate becomes `0px` and scale
becomes `1`, so the same rule fades without moving. Fade duration stays 80ms
so the state change is still visible.

## Intensity

```css
.quiet-panel {
  --ghost-motion-intensity: 0.5;
}
```

Every duration on that subtree, including nested springs, halves. `0` freezes
interpolation; state changes remain in the end values.

## Live demos

These reuse `data-motion` timing functions. Travel, duration, and replay are
demo-local so easing can be compared across the full track — production recipes
still move `4.5rem` in 120–1204ms. Replay remounts every row together. The first
run waits until the board is on screen.

<MotionReplayDemo />

## Theme crossfade helper

`startThemeTransition` is a small optional export from `@ghostvue/themes`. It
sets `data-ghost-mode` inside `document.startViewTransition` when that API exists
and the user has not requested reduced motion. Otherwise it writes the
attribute immediately.

```ts
import { startThemeTransition } from '@ghostvue/themes'

await startThemeTransition(document.querySelector('.ghost-theme'), 'dark')
```

<div
  ref="stage"
  class="ghost-theme demo-stage"
  data-ghost-mode="light"
  data-testid="motion-docs-stage"
>
  <p>Nested mode on this card.</p>
  <button
    type="button"
    class="demo-play"
    data-testid="motion-docs-mode-light"
    @click="crossfade('light')"
  >
    Light
  </button>
  <button
    type="button"
    class="demo-play"
    data-testid="motion-docs-mode-dark"
    @click="crossfade('dark')"
  >
    Dark
  </button>
</div>

## Playground

The playground Motion section uses the same recipes, an intensity slider, and
the crossfade helper. Reduced-motion browser tests assert computed button
transitions and collapsed translate/scale tokens.

<style>
.demo-play {
  background: var(--ghost-action-primary-bg, #1d4ed8);
  border: 0;
  border-radius: 0.5rem;
  color: var(--ghost-action-primary-fg, #fff);
  cursor: pointer;
  font: inherit;
  margin-inline-end: 0.4rem;
  padding: 0.4rem 0.75rem;
}
.demo-stage {
  border-radius: 1rem;
  margin: 1rem 0 1.5rem;
  padding: 1rem;
}
.demo-stage p {
  margin-block: 0 0.75rem;
}
</style>
