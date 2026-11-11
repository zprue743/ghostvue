<script setup lang="ts">
import { ref } from 'vue'

import { SlButton as SlButtonThemed } from '@slop-ui/themes'

const densities = ['compact', 'comfortable', 'spacious'] as const
const roundnesses = [0, 0.5, 1] as const
const sizes = ['sm', 'md', 'lg'] as const

const density = ref<(typeof densities)[number]>('comfortable')
const roundness = ref(1)
</script>

<template>
  <section
    class="density-reference"
    aria-labelledby="density-reference-heading"
    data-testid="density-reference"
  >
    <h2 id="density-reference-heading">Density, type, and roundness</h2>
    <p>
      <code>data-sl-density</code> nests like <code>data-sl-mode</code>. Unset
      density is comfortable. <code>--sl-roundness</code> (0–1) scales every
      radius from sharp to its designed value.
    </p>

    <div class="slop-theme controls" data-sl-mode="light">
      <label>
        Density
        <select v-model="density" data-testid="density-control">
          <option v-for="option in densities" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label>
        Roundness
        <input
          v-model.number="roundness"
          data-testid="roundness-control"
          type="range"
          min="0"
          max="1"
          step="0.05"
        />
        <span data-testid="roundness-value">{{ roundness }}</span>
      </label>
      <div
        class="preview"
        :data-sl-density="density"
        :style="{ '--sl-roundness': String(roundness) }"
        data-testid="density-preview"
      >
        <SlButtonThemed size="sm">Small</SlButtonThemed>
        <SlButtonThemed>Medium</SlButtonThemed>
        <SlButtonThemed size="lg">Large</SlButtonThemed>
      </div>
    </div>

    <div class="matrix" data-testid="density-matrix">
      <div
        v-for="mode in densities"
        :key="mode"
        class="slop-theme density-row"
        data-sl-mode="light"
        :data-sl-density="mode"
        :data-testid="`density-row-${mode}`"
      >
        <h3>{{ mode }}</h3>
        <div class="roundness-grid">
          <div
            v-for="amount in roundnesses"
            :key="`${mode}-${amount}`"
            class="roundness-cell"
            :style="{ '--sl-roundness': String(amount) }"
            :data-testid="`density-${mode}-roundness-${amount}`"
          >
            <span>roundness {{ amount }}</span>
            <div class="buttons">
              <SlButtonThemed
                v-for="size in sizes"
                :key="size"
                :size="size"
                :data-testid="`density-${mode}-roundness-${amount}-${size}`"
              >
                {{ size }}
              </SlButtonThemed>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.density-reference {
  display: grid;
  gap: 1rem;
  margin-block: 2rem;
}

.controls,
.density-row {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
}

.controls {
  align-items: center;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.preview,
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.roundness-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.roundness-cell {
  display: grid;
  gap: 0.5rem;
}
</style>
