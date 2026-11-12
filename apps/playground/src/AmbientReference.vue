<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton as GhostButtonThemed,
  GhostInteractiveSurface,
} from '@ghostvue/themes'

const intensity = ref(1)
const flagships = ['calm', 'vibrant', 'mono'] as const
</script>

<template>
  <section
    class="ambient-reference"
    aria-labelledby="ambient-reference-heading"
    data-testid="ambient-reference"
  >
    <h2 id="ambient-reference-heading">Ambient interactivity</h2>
    <p>
      Published spotlight recipe from ADR 0009. Tilt and magnetic are
      follow-ups. Effects are decoration and turn fully off under
      <code>prefers-reduced-motion</code> and coarse pointers.
    </p>

    <div
      class="ghost-theme stage"
      data-ghost-mode="light"
      data-testid="ambient-stage"
      :style="{ '--ghost-motion-intensity': String(intensity) }"
    >
      <div class="toolbar">
        <span>
          Intensity
          <button
            type="button"
            data-testid="ambient-intensity-full"
            @click="intensity = 1"
          >
            1
          </button>
          <button
            type="button"
            data-testid="ambient-intensity-half"
            @click="intensity = 0.5"
          >
            0.5
          </button>
          <button
            type="button"
            data-testid="ambient-intensity-off"
            @click="intensity = 0"
          >
            0
          </button>
          <span data-testid="ambient-intensity-value">{{ intensity }}</span>
        </span>
      </div>

      <div class="demo-grid">
        <GhostInteractiveSurface
          as="article"
          class="host"
          data-elevation="2"
          data-testid="ambient-spotlight"
        >
          <h3>Spotlight</h3>
          <p>
            The glow follows the pointer through
            <code>--ghost-pointer-x</code> and <code>--ghost-pointer-y</code>.
            Copy stays readable without the effect.
          </p>
        </GhostInteractiveSurface>

        <article
          class="host rest"
          data-elevation="2"
          data-testid="ambient-button-host"
        >
          <h3>GhostButton opt-in</h3>
          <p>
            Off by default. This control sets
            <code>interactive="spotlight"</code>.
          </p>
          <div data-testid="ambient-button-shot">
            <GhostButtonThemed
              interactive="spotlight"
              data-testid="ambient-button-spotlight"
            >
              Save report
            </GhostButtonThemed>
          </div>
        </article>
      </div>
    </div>

    <h3>Flagship tuning</h3>
    <p>
      Calm and mono use the subtle knob (mono’s chroma-0 primary is the
      hairline). Vibrant uses expressive.
    </p>
    <div class="flagship-grid">
      <div
        v-for="theme in flagships"
        :key="theme"
        class="ghost-theme flagship"
        :data-ghost-theme="theme"
        data-ghost-mode="light"
        :data-testid="`ambient-flagship-${theme}`"
      >
        <strong>{{ theme }}</strong>
        <GhostInteractiveSurface
          class="host compact"
          data-elevation="2"
          :data-testid="`ambient-flagship-surface-${theme}`"
        >
          Preview
        </GhostInteractiveSurface>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ambient-reference {
  font-family: Arial, Helvetica, sans-serif;
}

.stage {
  border-radius: var(--ghost-radius-lg);
  margin-block: var(--ghost-space-stack-md);
  padding: var(--ghost-space-inset-md);
}

.toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-md);
  margin-block-end: var(--ghost-space-stack-md);
}

.toolbar button {
  font: inherit;
}

.demo-grid,
.flagship-grid {
  display: grid;
  gap: var(--ghost-space-gap-lg);
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

:deep(.host) {
  min-block-size: 12rem;
  padding: var(--ghost-space-inset-md);
}

:deep(.host) h3,
:deep(.host) p {
  margin: 0;
}

:deep(.host) p {
  color: var(--ghost-text-muted);
}

.host.rest {
  display: grid;
  gap: var(--ghost-space-stack-sm);
  justify-items: start;
  min-block-size: 12rem;
  padding: var(--ghost-space-inset-md);
}

:deep(.compact) {
  min-block-size: 5.5rem;
}

.flagship {
  border-radius: var(--ghost-radius-md);
  display: grid;
  gap: var(--ghost-space-stack-sm);
  padding: var(--ghost-space-inset-sm);
}
</style>
