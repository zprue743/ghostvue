<script setup lang="ts">
import { ref } from 'vue'

import { GhostSlider } from '@ghostvue/vue'

const amount = ref(35)
</script>

<template>
  <GhostSlider
    v-model="amount"
    aria-label="Donation amount slider"
    :min="0"
    :max="100"
    :step="5"
  />
  <p>{{ amount }} credits</p>
</template>

<style scoped>
/*
 * Headless path ships no visuals; this is consumer CSS for the sample. The
 * library positions the rail, range, and thumbs; the sample gives the root a
 * box and paints the parts. Parts render inside GhostSlider, so scoped CSS
 * needs :deep(). System colors follow light and dark mode without a theme.
 */
.ghost-slider {
  block-size: 1.5rem;
  inline-size: min(100%, 20rem);
  position: relative;
}

.ghost-slider :deep([data-part='rail']) {
  background: GrayText;
  border-radius: 999px;
}

.ghost-slider :deep([data-part='range']) {
  background: Highlight;
  border-radius: 999px;
}

.ghost-slider :deep([data-part='thumb']) {
  background: Canvas;
  block-size: 1.125rem;
  border: 2px solid Highlight;
  border-radius: 50%;
  box-sizing: border-box;
  inline-size: 1.125rem;
}
</style>
