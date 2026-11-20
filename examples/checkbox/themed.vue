<script setup lang="ts">
import { ref } from 'vue'

import { GhostCheckbox } from '@ghostvue/themes'

const unchecked = ref(false)
const checked = ref(true)
const mixed = ref(false)
// Mixed until the first click, the way a select-all leaves it once resolved.
const isMixed = ref(true)

const digest = ref(true)
const updates = ref(true)
const purge = ref(false)
</script>

<template>
  <div class="themed">
    <div class="themed__group" role="group" aria-labelledby="themed-states">
      <p id="themed-states" class="themed__caption">States</p>
      <div class="themed__grid">
        <label class="themed__option">
          <GhostCheckbox v-model="unchecked" />
          Unchecked
        </label>
        <label class="themed__option">
          <GhostCheckbox v-model="checked" />
          Checked
        </label>
        <label class="themed__option">
          <GhostCheckbox
            v-model="mixed"
            :indeterminate="isMixed"
            @update:model-value="isMixed = false"
          />
          Mixed
        </label>
        <label class="themed__option">
          <GhostCheckbox disabled />
          Disabled
        </label>
        <label class="themed__option">
          <GhostCheckbox disabled default-value />
          Disabled, checked
        </label>
      </div>
    </div>

    <div class="themed__group" role="group" aria-labelledby="themed-tones">
      <p id="themed-tones" class="themed__caption">Tone and size</p>
      <div class="themed__grid">
        <label class="themed__option">
          <GhostCheckbox v-model="digest" size="sm" tone="neutral" />
          Weekly digest
        </label>
        <label class="themed__option">
          <GhostCheckbox v-model="updates" />
          Product updates
        </label>
        <label class="themed__option">
          <GhostCheckbox v-model="purge" size="lg" tone="danger" />
          Delete files
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.themed {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.themed__group {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}

.themed__caption {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  text-transform: uppercase;
}

/* Cells keep about 11rem each and wrap to fewer columns when narrow. */
.themed__grid {
  display: grid;
  gap: var(--ghost-space-gap-xs) var(--ghost-space-gap-md);
  grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr));
}

/* The checkbox brings its own hit target; the label centers text on it. */
.themed__option {
  align-items: center;
  color: var(--ghost-text-default);
  cursor: pointer;
  display: flex;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-snug);
}

.themed__option:has(:disabled) {
  color: var(--ghost-text-muted);
  cursor: not-allowed;
}
</style>
