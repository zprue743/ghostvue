<script setup lang="ts">
import { ref } from 'vue'

import { GhostPortal, GhostPresence } from '@ghostvue/vue'

const open = ref(false)
</script>

<template>
  <div class="presence-portal">
    <button
      type="button"
      class="presence-portal__toggle"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ open ? 'Hide draft' : 'Show draft' }}
    </button>

    <GhostPortal>
      <GhostPresence v-slot="{ state, exiting, setElement }" :present="open">
        <!-- Two roots: bind the surface whose motion gates removal. -->
        <div
          class="presence-portal__backdrop"
          aria-hidden="true"
          :data-state="state"
          @click="open = false"
        ></div>
        <div
          :ref="setElement"
          class="presence-portal__notice"
          role="region"
          aria-label="Saved draft"
          :data-state="state"
          :inert="exiting || undefined"
        >
          <p>Draft saved to your workspace.</p>
          <button
            type="button"
            class="presence-portal__toggle"
            @click="open = false"
          >
            Close
          </button>
        </div>
      </GhostPresence>
    </GhostPortal>
  </div>
</template>

<style scoped>
.presence-portal__toggle {
  border: 1px solid ButtonBorder;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
}

.presence-portal__backdrop {
  background: color-mix(in srgb, CanvasText 20%, transparent);
  inset: 0;
  position: fixed;
  transition: opacity 120ms ease;
  z-index: 49;

  @starting-style {
    opacity: 0;
  }
}

.presence-portal__notice {
  background: Canvas;
  border: 1px solid GrayText;
  border-radius: 0.5rem;
  color: CanvasText;
  inset-block-end: 1rem;
  inset-inline-end: 1rem;
  padding: 0.75rem 1rem;
  position: fixed;
  transition: opacity 120ms ease;
  z-index: 50;

  @starting-style {
    opacity: 0;
  }
}

.presence-portal__backdrop[data-state='closed'],
.presence-portal__notice[data-state='closed'] {
  opacity: 0;
  pointer-events: none;
}
</style>
