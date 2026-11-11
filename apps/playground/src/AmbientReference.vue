<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { SlButton as SlButtonThemed } from '@slop-ui/themes'

import { useInteractiveSurface } from './use-interactive-surface'

const intensity = ref(1)
const spotlightHost = useTemplateRef<HTMLElement>('spotlight-host')
const tiltHost = useTemplateRef<HTMLElement>('tilt-host')

const { rootProps: spotlightProps } = useInteractiveSurface(spotlightHost, {
  effects: ['spotlight'],
})
const { rootProps: tiltProps } = useInteractiveSurface(tiltHost, {
  effects: ['tilt', 'magnetic'],
})

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
      Playground spike for SLO-62, not a published API. Pointer spotlight and
      magnetic tilt write CSS variables; recipes consume tokens. Effects are
      decoration and turn fully off under
      <code>prefers-reduced-motion</code>.
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
        <article
          ref="spotlight-host"
          class="host"
          data-testid="ambient-spotlight"
          v-bind="spotlightProps"
        >
          <span data-part="glow" aria-hidden="true" />
          <div data-part="face">
            <h3>Spotlight</h3>
            <p>
              The glow follows the pointer through
              <code>--sl-pointer-x</code> and <code>--sl-pointer-y</code>. Copy
              stays readable without the effect.
            </p>
          </div>
        </article>

        <article
          ref="tilt-host"
          class="host"
          data-testid="ambient-tilt"
          v-bind="tiltProps"
        >
          <div data-part="face">
            <h3>Magnetic tilt</h3>
            <p>
              Inner face uses transform only. Leave settles with
              <code>--sl-motion-spring-snappy</code>.
            </p>
            <SlButtonThemed> Open report </SlButtonThemed>
          </div>
        </article>
      </div>
    </div>

    <h3>Flagship tuning</h3>
    <p>
      Local stand-ins for the tokens proposed in ADR 0009. Calm stays quiet;
      vibrant leans in; mono keeps a hairline glow and no tilt.
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
        <div
          class="host spotlight compact"
          data-part="root"
          data-interactive="spotlight"
          data-state="idle"
        >
          <span data-part="glow" aria-hidden="true" />
          <div data-part="face">Preview at rest</div>
        </div>
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

.host {
  --sl-pointer-x: 50%;
  --sl-pointer-y: 50%;
  --sl-pointer-nx: 0;
  --sl-pointer-ny: 0;
  --sl-tilt-x: 0;
  --sl-tilt-y: 0;
  --sl-magnetic-x: 0;
  --sl-magnetic-y: 0;
  --sl-interactive-spotlight-size: 16rem;
  --sl-interactive-spotlight-opacity: 0.55;
  --sl-interactive-tilt-max: 1;
  --sl-interactive-magnetic-distance: 1;
  background-color: var(--sl-elevation-2-bg);
  border: var(--sl-border-hairline-width) solid var(--sl-elevation-2-border);
  border-radius: var(--sl-radius-lg);
  box-shadow: var(--sl-elevation-2-shadow), var(--sl-elevation-2-highlight);
  isolation: isolate;
  min-block-size: 12rem;
  overflow: hidden;
  padding: var(--sl-space-inset-md);
  perspective: 48rem;
  position: relative;
}

.host[data-state='tracking'] {
  will-change: transform;
}

.host[data-part='root'] > [data-part='glow'] {
  background: radial-gradient(
    circle,
    color-mix(in oklch, var(--sl-action-primary-bg) 55%, transparent),
    transparent 70%
  );
  block-size: var(--sl-interactive-spotlight-size);
  border-radius: 50%;
  display: none;
  inline-size: var(--sl-interactive-spotlight-size);
  inset-block-start: 0;
  inset-inline-start: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  transform: translate3d(
    calc(var(--sl-pointer-x) - 50%),
    calc(var(--sl-pointer-y) - 50%),
    0
  );
  transition: opacity var(--sl-motion-duration-fast)
    var(--sl-motion-easing-standard);
  z-index: 0;
}

.host[data-interactive~='spotlight'] > [data-part='glow'] {
  display: block;
}

.host[data-interactive~='spotlight'][data-state='tracking']
  > [data-part='glow'] {
  opacity: calc(
    var(--sl-interactive-spotlight-opacity) * var(--sl-motion-intensity, 1)
  );
}

.host[data-state='tracking'] > [data-part='glow'] {
  transition-duration: var(--sl-motion-duration-instant);
  will-change: transform, opacity;
}

.host > [data-part='face'] {
  color: var(--sl-text-default);
  display: grid;
  gap: var(--sl-space-stack-sm);
  position: relative;
  transform: translate3d(
      calc(
        var(--sl-magnetic-x) * 1px * var(--sl-interactive-magnetic-distance) *
          var(--sl-motion-intensity, 1)
      ),
      calc(
        var(--sl-magnetic-y) * 1px * var(--sl-interactive-magnetic-distance) *
          var(--sl-motion-intensity, 1)
      ),
      0
    )
    rotateX(
      calc(
        var(--sl-tilt-x) * 1deg * var(--sl-interactive-tilt-max) *
          var(--sl-motion-intensity, 1)
      )
    )
    rotateY(
      calc(
        var(--sl-tilt-y) * 1deg * var(--sl-interactive-tilt-max) *
          var(--sl-motion-intensity, 1)
      )
    );
  transform-style: preserve-3d;
  transition: transform var(--sl-motion-spring-snappy-duration)
    var(--sl-motion-spring-snappy);
  z-index: 1;
}

.host[data-state='tracking'] > [data-part='face'] {
  transition-duration: var(--sl-motion-duration-instant);
}

.host h3,
.host p {
  margin: 0;
}

.host p {
  color: var(--sl-text-muted);
}

.compact {
  min-block-size: 5.5rem;
}

/* Rest previews keep a parked glow so flagship token stand-ins are visible. */
.compact[data-interactive~='spotlight'] > [data-part='glow'] {
  --sl-pointer-x: 70%;
  --sl-pointer-y: 35%;
  opacity: calc(var(--sl-interactive-spotlight-opacity) * 0.5);
}

.flagship {
  border-radius: var(--sl-radius-md);
  display: grid;
  gap: var(--sl-space-stack-sm);
  padding: var(--sl-space-inset-sm);
}

.flagship[data-sl-theme='calm'] {
  --sl-interactive-spotlight-opacity: 0.28;
  --sl-interactive-spotlight-size: 10rem;
  --sl-interactive-tilt-max: 0;
  --sl-interactive-magnetic-distance: 0.35;
}

.flagship[data-sl-theme='vibrant'] {
  --sl-interactive-spotlight-opacity: 0.8;
  --sl-interactive-spotlight-size: 20rem;
  --sl-interactive-tilt-max: 1;
  --sl-interactive-magnetic-distance: 1;
}

.flagship[data-sl-theme='mono'] {
  --sl-interactive-spotlight-opacity: 0.18;
  --sl-interactive-spotlight-size: 12rem;
  --sl-interactive-tilt-max: 0;
  --sl-interactive-magnetic-distance: 0;
}

@media (prefers-reduced-motion: reduce) {
  .host > [data-part='glow'],
  .compact[data-interactive~='spotlight'] > [data-part='glow'] {
    display: none;
    opacity: 0;
    transform: none;
    transition: none;
  }

  .host > [data-part='face'] {
    transform: none;
    transition: none;
  }
}
</style>
