<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import '@ghostvue/themes/default.css'
import { startThemeTransition } from '../../packages/themes/src/start-theme-transition'

/** Demo-local times so easing differences stay readable across a full track. */
const recipes = [
  { id: 'standard', duration: '1.4s' },
  { id: 'decelerate', duration: '1.4s' },
  { id: 'accelerate', duration: '0.9s' },
  { id: 'spring-gentle', duration: '2s' },
  { id: 'spring-snappy', duration: '1.8s' },
  { id: 'spring-bouncy', duration: '2.8s' },
]

const replay = ref(0)
const armed = ref(false)
const stage = ref(null)
const board = ref(null)

let intersection

function play() {
  armed.value = true
  replay.value += 1
}

async function crossfade(mode) {
  if (stage.value) await startThemeTransition(stage.value, mode)
}

onMounted(() => {
  const host = board.value
  if (!(host instanceof Element) || typeof IntersectionObserver !== 'function') {
    play()
    return
  }

  // Recipes auto-play on insert with fill-both, so a below-the-fold first
  // paint finishes before anyone sees it. Arm once the board is on screen.
  intersection = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        if (!armed.value) play()
        intersection?.disconnect()
      }
    },
    { threshold: 0.35 },
  )
  intersection.observe(host)
})

onUnmounted(() => {
  intersection?.disconnect()
})
</script>

# Motion

SLO-65 recipes on top of the [token catalog](./tokens.md). Components consume
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

<p>
  <button
    type="button"
    class="demo-play"
    data-testid="motion-docs-replay"
    @click="play"
  >
    Replay easings and springs
  </button>
</p>

<div
  ref="board"
  class="ghost-theme demo-board"
  data-ghost-mode="light"
  data-testid="motion-docs-board"
>
  <p
    class="demo-reduced-note"
    data-testid="motion-docs-reduced-note"
    role="status"
  >
    Reduced motion is on. Dots fade in place instead of traveling, so this
    demo is not broken.
  </p>
  <div
    v-for="recipe in recipes"
    :key="recipe.id + '-' + replay"
    class="demo-row"
  >
    <span>{{ recipe.id }} · {{ recipe.duration }}</span>
    <div class="demo-track">
      <span
        class="demo-dot"
        :data-motion="armed ? recipe.id : undefined"
        :data-testid="'motion-docs-dot-' + recipe.id"
        :style="{ '--demo-motion-duration': recipe.duration }"
      ></span>
    </div>
  </div>
</div>

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
.demo-board,
.demo-stage {
  border-radius: 1rem;
  margin: 1rem 0 1.5rem;
  padding: 1rem;
}
.demo-board {
  /* Calm docs inherit intensity 0.6; pin 1 so demo times match the labels. */
  --ghost-motion-intensity: 1;
}
.demo-reduced-note {
  display: none;
  margin-block: 0 0.75rem;
}
.demo-row {
  align-items: center;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 12.5rem 1fr;
  margin-block: 0.45rem;
}
.demo-track {
  background: var(--ghost-surface-muted-bg);
  border-radius: 999px;
  min-block-size: 2rem;
  overflow: hidden;
  padding: 0.35rem;
}
.demo-dot {
  background: var(--ghost-action-primary-bg);
  block-size: 1.25rem;
  border-radius: 999px;
  display: block;
  inline-size: 1.25rem;
}
.demo-dot[data-motion] {
  /* Keep recipe easing/fill; margin % is the track, unlike translate %. */
  animation-duration: var(--demo-motion-duration);
  animation-name: ghost-docs-motion-shift;
}
@keyframes ghost-docs-motion-shift {
  from {
    margin-inline-start: 0;
  }

  to {
    margin-inline-start: calc(100% - 1.25rem);
  }
}
.demo-stage p {
  margin-block: 0 0.75rem;
}
@media (prefers-reduced-motion: reduce) {
  .demo-reduced-note {
    display: block;
  }

  .demo-dot[data-motion] {
    animation-duration: 0.7s;
    animation-name: ghost-motion-fade;
  }
}
</style>
