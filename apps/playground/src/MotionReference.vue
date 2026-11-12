<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { startThemeTransition } from '@ghostvue/themes'

const recipes = [
  'standard',
  'decelerate',
  'accelerate',
  'spring-gentle',
  'spring-snappy',
  'spring-bouncy',
] as const

const replay = ref(0)
const intensity = ref(1)
const stage = useTemplateRef<HTMLElement>('motion-stage')

function play() {
  replay.value += 1
}

async function crossfade(mode: 'light' | 'dark') {
  if (stage.value) await startThemeTransition(stage.value, mode)
}
</script>

<template>
  <section
    class="motion-reference"
    aria-labelledby="motion-reference-heading"
    data-testid="motion-reference"
  >
    <h2 id="motion-reference-heading">Motion</h2>
    <p>
      Duration, easing, and spring tokens. Recipes honor
      <code>prefers-reduced-motion</code>. Intensity scales every duration
      through <code>calc()</code>.
    </p>

    <div
      ref="motion-stage"
      class="ghost-theme stage"
      data-ghost-mode="light"
      data-testid="motion-stage"
      :style="{ '--ghost-motion-intensity': String(intensity) }"
    >
      <div class="toolbar">
        <button type="button" data-testid="motion-replay" @click="play">
          Replay
        </button>
        <span>
          Intensity
          <button
            type="button"
            data-testid="motion-intensity-full"
            @click="intensity = 1"
          >
            1
          </button>
          <button
            type="button"
            data-testid="motion-intensity-half"
            @click="intensity = 0.5"
          >
            0.5
          </button>
          <button
            type="button"
            data-testid="motion-intensity-off"
            @click="intensity = 0"
          >
            0
          </button>
          <span data-testid="motion-intensity-value">{{ intensity }}</span>
        </span>
        <button
          type="button"
          data-testid="motion-mode-light"
          @click="crossfade('light')"
        >
          Light
        </button>
        <button
          type="button"
          data-testid="motion-mode-dark"
          @click="crossfade('dark')"
        >
          Dark
        </button>
      </div>

      <div v-for="recipe in recipes" :key="`${recipe}-${replay}`" class="row">
        <span>{{ recipe }}</span>
        <div class="track">
          <span
            class="dot"
            :data-motion="recipe"
            :data-testid="`motion-dot-${recipe}`"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.motion-reference {
  font-family: Arial, Helvetica, sans-serif;
}

.stage {
  border-radius: 1rem;
  margin-block: 0.75rem;
  padding: 1rem;
}

.toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block-end: 0.85rem;
}

.toolbar button,
.toolbar input {
  font: inherit;
}

.row {
  align-items: center;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 9rem 1fr;
  margin-block: 0.4rem;
}

.track {
  background: var(--ghost-surface-muted-bg);
  border-radius: 999px;
  min-block-size: 2rem;
  overflow: hidden;
  padding: 0.35rem;
}

.dot {
  background: var(--ghost-action-primary-bg);
  block-size: 1.25rem;
  border-radius: 999px;
  display: block;
  inline-size: 1.25rem;
}
</style>
