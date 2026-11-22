<script setup lang="ts">
import { computed, ref } from 'vue'

import { GhostButton, GhostCard, GhostSlider } from '@ghostvue/themes'

const masterGain = ref(72)
const bandRange = ref<[number, number]>([250, 1400])
const limiter = ref(90)
const status = ref('')

const rangeLabel = computed(
  () => `${String(bandRange.value[0])} Hz – ${String(bandRange.value[1])} Hz`,
)

function resetMixer(): void {
  masterGain.value = 72
  bandRange.value = [250, 1400]
  status.value = 'Audio levels reset to defaults.'
}
</script>

<template>
  <section class="mixer" aria-labelledby="mixer-title">
    <GhostCard>
      <template #header>
        <div class="mixer__header">
          <h2 id="mixer-title" class="mixer__title">Export mastering</h2>
          <p class="mixer__lead">
            Tune output gain and passband filter before rendering the stem.
          </p>
        </div>
      </template>

      <div class="mixer__controls">
        <div class="mixer__row">
          <div class="mixer__row-head">
            <span id="mixer-gain-label" class="mixer__label">
              Master output
            </span>
            <span class="mixer__value">{{ masterGain }}%</span>
          </div>
          <GhostSlider
            v-model="masterGain"
            :min="0"
            :max="100"
            :step="1"
            aria-labelledby="mixer-gain-label"
            :value-text="`${masterGain} percent`"
            @update:model-value="status = ''"
          />
        </div>

        <div class="mixer__row">
          <div class="mixer__row-head">
            <span id="mixer-band-label" class="mixer__label">
              Passband frequency
            </span>
            <span class="mixer__value">{{ rangeLabel }}</span>
          </div>
          <GhostSlider
            v-model="bandRange"
            range
            :min="100"
            :max="2000"
            :step="50"
            aria-labelledby="mixer-band-label"
            :value-text="rangeLabel"
            @update:model-value="status = ''"
          />
        </div>

        <div class="mixer__row">
          <div class="mixer__row-head">
            <span id="mixer-limiter-label" class="mixer__label">
              Safety limiter (locked)
            </span>
            <span class="mixer__value">{{ limiter }}%</span>
          </div>
          <GhostSlider
            v-model="limiter"
            disabled
            :min="0"
            :max="100"
            tone="neutral"
            aria-labelledby="mixer-limiter-label"
            :value-text="`${limiter} percent`"
          />
        </div>
      </div>

      <template #footer>
        <div class="mixer__actions">
          <p class="mixer__status" role="status">{{ status }}</p>
          <GhostButton
            type="button"
            variant="ghost"
            tone="neutral"
            class="mixer__action"
            @click="resetMixer"
          >
            Reset levels
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </section>
</template>

<style scoped>
.mixer {
  max-inline-size: 34rem;
}

.mixer__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.mixer__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.mixer__lead,
.mixer__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.mixer__controls {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.mixer__row {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.mixer__row-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.mixer__label {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.mixer__value {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-variant-numeric: tabular-nums;
  line-height: var(--ghost-type-line-snug);
}

.mixer__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.mixer :deep(.mixer__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .mixer__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .mixer__status {
    flex: 1 1 auto;
  }

  .mixer :deep(.mixer__action) {
    inline-size: auto;
  }
}
</style>
