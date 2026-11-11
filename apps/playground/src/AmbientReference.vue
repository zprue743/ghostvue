<script setup lang="ts">
import { ref } from 'vue'

import {
  SlButton as SlButtonThemed,
  SlInteractiveSurface,
} from '@slop-ui/themes'

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
      class="slop-theme stage"
      data-sl-mode="light"
      data-testid="ambient-stage"
      :style="{ '--sl-motion-intensity': String(intensity) }"
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
        <SlInteractiveSurface
          as="article"
          class="host"
          data-elevation="2"
          data-testid="ambient-spotlight"
        >
          <h3>Spotlight</h3>
          <p>
            The glow follows the pointer through
            <code>--sl-pointer-x</code> and <code>--sl-pointer-y</code>. Copy
            stays readable without the effect.
          </p>
        </SlInteractiveSurface>

        <article
          class="host rest"
          data-elevation="2"
          data-testid="ambient-button-host"
        >
          <h3>SlButton opt-in</h3>
          <p>
            Off by default. This control sets
            <code>interactive="spotlight"</code>.
          </p>
          <SlButtonThemed
            interactive="spotlight"
            data-testid="ambient-button-spotlight"
          >
            Save report
          </SlButtonThemed>
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
        class="slop-theme flagship"
        :data-sl-theme="theme"
        data-sl-mode="light"
        :data-testid="`ambient-flagship-${theme}`"
      >
        <strong>{{ theme }}</strong>
        <SlInteractiveSurface
          class="host compact"
          data-elevation="2"
          :data-testid="`ambient-flagship-surface-${theme}`"
        >
          Preview
        </SlInteractiveSurface>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ambient-reference {
  font-family: Arial, Helvetica, sans-serif;
}

.stage {
  border-radius: var(--sl-radius-lg);
  margin-block: var(--sl-space-stack-md);
  padding: var(--sl-space-inset-md);
}

.toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--sl-space-gap-md);
  margin-block-end: var(--sl-space-stack-md);
}

.toolbar button {
  font: inherit;
}

.demo-grid,
.flagship-grid {
  display: grid;
  gap: var(--sl-space-gap-lg);
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

:deep(.host) {
  min-block-size: 12rem;
  padding: var(--sl-space-inset-md);
}

:deep(.host) h3,
:deep(.host) p {
  margin: 0;
}

:deep(.host) p {
  color: var(--sl-text-muted);
}

.host.rest {
  display: grid;
  gap: var(--sl-space-stack-sm);
  justify-items: start;
  min-block-size: 12rem;
  padding: var(--sl-space-inset-md);
}

:deep(.compact) {
  min-block-size: 5.5rem;
}

.flagship {
  border-radius: var(--sl-radius-md);
  display: grid;
  gap: var(--sl-space-stack-sm);
  padding: var(--sl-space-inset-sm);
}
</style>
