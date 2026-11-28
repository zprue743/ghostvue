<script setup lang="ts">
import { ref } from 'vue'

import { GhostPresence } from '@ghostvue/vue'

const open = ref(false)
const exits = ref(0)
</script>

<template>
  <div class="presence-basic">
    <button
      type="button"
      class="presence-basic__toggle"
      aria-controls="presence-basic-panel"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ open ? 'Hide inspector' : 'Show inspector' }}
    </button>

    <GhostPresence :present="open" @exit-complete="exits += 1">
      <aside
        id="presence-basic-panel"
        class="presence-basic__panel"
        aria-label="Inspector"
      >
        <p>Selection: 3 layers</p>
        <button type="button" class="presence-basic__toggle">Group</button>
      </aside>
    </GhostPresence>

    <p class="presence-basic__status">Completed exits: {{ exits }}</p>
  </div>
</template>

<style scoped>
.presence-basic {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}

.presence-basic__toggle {
  border: 1px solid ButtonBorder;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
}

/* Plain CSS against the data-state hook GhostPresence writes. */
.presence-basic__panel {
  border: 1px solid GrayText;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  transition:
    opacity 120ms ease,
    translate 120ms ease;

  @starting-style {
    opacity: 0;
    translate: 0 0.5rem;
  }
}

.presence-basic__panel[data-state='closed'] {
  opacity: 0;
  translate: 0 0.5rem;
}

@media (prefers-reduced-motion: reduce) {
  .presence-basic__panel,
  .presence-basic__panel[data-state='closed'] {
    translate: none;
  }
}

.presence-basic__status {
  font-size: 0.875rem;
  margin: 0;
}
</style>
