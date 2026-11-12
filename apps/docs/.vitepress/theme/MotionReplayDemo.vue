<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/** Demo-local times so easing differences stay readable across a full track. */
const recipes = [
  { id: 'standard', duration: '1.4s' },
  { id: 'decelerate', duration: '1.4s' },
  { id: 'accelerate', duration: '0.9s' },
  { id: 'spring-gentle', duration: '2s' },
  { id: 'spring-snappy', duration: '1.8s' },
  { id: 'spring-bouncy', duration: '2.8s' },
] as const

const replay = ref(0)
const armed = ref(false)
const board = ref<HTMLElement | null>(null)

// Production compiles a constant v-for as STABLE_FRAGMENT and patches
// children by index, so a row key that includes `replay` does not remount.
// The template keys a wrapper on `replay` so Replay restarts the animations.

let intersection: IntersectionObserver | undefined

function play(): void {
  armed.value = true
  replay.value += 1
}

onMounted(() => {
  const host = board.value
  if (
    !(host instanceof Element) ||
    typeof IntersectionObserver !== 'function'
  ) {
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

<template>
  <div class="motion-replay-demo">
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
      <div :key="replay">
        <div v-for="recipe in recipes" :key="recipe.id" class="demo-row">
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
    </div>
  </div>
</template>

<style>
.motion-replay-demo .demo-play {
  background: var(--ghost-action-primary-bg, #1d4ed8);
  border: 0;
  border-radius: 0.5rem;
  color: var(--ghost-action-primary-fg, #fff);
  cursor: pointer;
  font: inherit;
  margin-inline-end: 0.4rem;
  padding: 0.4rem 0.75rem;
}

.motion-replay-demo .demo-board {
  border-radius: 1rem;
  margin: 1rem 0 1.5rem;
  padding: 1rem;
  /* Calm docs inherit intensity 0.6; pin 1 so demo times match the labels. */
  --ghost-motion-intensity: 1;
}

.motion-replay-demo .demo-reduced-note {
  display: none;
  margin-block: 0 0.75rem;
}

.motion-replay-demo .demo-row {
  align-items: center;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 12.5rem 1fr;
  margin-block: 0.45rem;
}

.motion-replay-demo .demo-track {
  background: var(--ghost-surface-muted-bg);
  border-radius: 999px;
  min-block-size: 2rem;
  overflow: hidden;
  padding: 0.35rem;
}

.motion-replay-demo .demo-dot {
  background: var(--ghost-action-primary-bg);
  block-size: 1.25rem;
  border-radius: 999px;
  display: block;
  inline-size: 1.25rem;
}

.motion-replay-demo .demo-dot[data-motion] {
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

@media (prefers-reduced-motion: reduce) {
  .motion-replay-demo .demo-reduced-note {
    display: block;
  }

  .motion-replay-demo .demo-dot[data-motion] {
    animation-name: ghost-motion-fade;
    /*
     * VitePress theme-default sets `animation-duration: 1ms !important` on
     * every element under reduced motion. Beat that only inside this demo
     * so the fade stays visible as the note claims.
     */
    animation-duration: 0.7s !important;
  }
}
</style>
