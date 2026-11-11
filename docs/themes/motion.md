<script setup>
import { ref } from 'vue'

import '@slop-ui/themes/default.css'
import { startThemeTransition } from '../../packages/themes/src/start-theme-transition'

const replay = ref(0)
const stage = ref(null)

function play() {
  replay.value += 1
}

async function crossfade(mode) {
  if (stage.value) await startThemeTransition(stage.value, mode)
}
</script>

# Motion

SLO-65 recipes on top of the [token catalog](./tokens.md). Components consume
semantic `--sl-*` variables. `data-motion` attributes are documented utilities
in `@slop-ui/themes` default CSS. They are not per-component tokens.

Duration CSS values are `calc(<ms> * var(--sl-motion-intensity, 1))`. Set
`--sl-motion-intensity` (0–1, default 1) on any subtree to scale every
duration without rewriting each property. Modes still nest through
`data-sl-mode`.

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
(`--sl-motion-spring-gentle-duration`, and the same for snappy and bouncy).
Use the easing string as `animation-timing-function` or
`transition-timing-function`, and the settle duration as the duration.

## Choreography

- **Exits run faster than enters.** `motion.exit.duration` aliases fast;
  `motion.enter.duration` aliases moderate. Arrivals get time to land;
  departures get out of the way.
- **Stagger from the trigger.** Offset each item by `n * var(--sl-motion-stagger)`.
  Under reduced motion stagger becomes 0 so the group appears together.
- **Animate from the trigger origin.** Set `transform-origin` (or
  `transform-box`) on the moving surface to the point that opened it — the
  button, the row, the caret — instead of the viewport center.

```css
.menu {
  transform-origin: var(--menu-origin, top left);
  transition:
    opacity var(--sl-motion-enter-duration) var(--sl-motion-enter-easing),
    transform var(--sl-motion-enter-duration) var(--sl-motion-enter-easing);
}

.menu[data-state='closed'] {
  opacity: 0;
  transform: translateY(var(--sl-motion-translate))
    scale(var(--sl-motion-scale));
  transition-duration: var(--sl-motion-exit-duration);
  transition-timing-function: var(--sl-motion-exit-easing);
}
```

Under `prefers-reduced-motion: reduce`, translate becomes `0px` and scale
becomes `1`, so the same rule fades without moving. Fade duration stays 80ms
so the state change is still visible.

## Intensity

```css
.quiet-panel {
  --sl-motion-intensity: 0.5;
}
```

Every duration on that subtree, including nested springs, halves. `0` freezes
interpolation; state changes remain in the end values.

## Live demos

These use `data-motion` recipes. Replay remounts the dots. The recipes already
honor `prefers-reduced-motion: reduce` by swapping travel for opacity.

<p>
  <button type="button" class="demo-play" @click="play">Replay easings and springs</button>
</p>

<div class="slop-theme demo-board" data-sl-mode="light">
  <div v-for="recipe in ['standard', 'decelerate', 'accelerate', 'spring-gentle', 'spring-snappy', 'spring-bouncy']" :key="`${recipe}-${replay}`" class="demo-row">
    <span>{{ recipe }}</span>
    <div class="demo-track">
      <span class="demo-dot" :data-motion="recipe"></span>
    </div>
  </div>
</div>

## Theme crossfade helper

`startThemeTransition` is a small optional export from `@slop-ui/themes`. It
sets `data-sl-mode` inside `document.startViewTransition` when that API exists
and the user has not requested reduced motion. Otherwise it writes the
attribute immediately.

```ts
import { startThemeTransition } from '@slop-ui/themes'

await startThemeTransition(document.querySelector('.slop-theme'), 'dark')
```

<div ref="stage" class="slop-theme demo-stage" data-sl-mode="light">
  <p>Nested mode on this card.</p>
  <button type="button" class="demo-play" @click="crossfade('light')">Light</button>
  <button type="button" class="demo-play" @click="crossfade('dark')">Dark</button>
</div>

## Playground

The playground Motion section uses the same recipes, an intensity slider, and
the crossfade helper. Reduced-motion browser tests assert computed button
transitions and collapsed translate/scale tokens.

<style>
.demo-play {
  background: var(--sl-action-primary-bg, #1d4ed8);
  border: 0;
  border-radius: 0.5rem;
  color: var(--sl-action-primary-fg, #fff);
  cursor: pointer;
  font: inherit;
  margin-inline-end: 0.4rem;
  padding: 0.4rem 0.75rem;
}
.demo-board,
.demo-stage {
  border-radius: 1rem;
  margin: 1rem 0 1.5rem;
  padding: 1rem;
}
.demo-row {
  align-items: center;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 8.5rem 1fr;
  margin-block: 0.45rem;
}
.demo-track {
  background: var(--sl-surface-muted-bg);
  border-radius: 999px;
  min-block-size: 2rem;
  overflow: hidden;
  padding: 0.35rem;
}
.demo-dot {
  background: var(--sl-action-primary-bg);
  block-size: 1.25rem;
  border-radius: 999px;
  display: block;
  inline-size: 1.25rem;
}
.demo-stage p {
  margin-block: 0 0.75rem;
}
</style>
