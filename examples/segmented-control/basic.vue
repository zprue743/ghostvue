<script setup lang="ts">
import { ref } from 'vue'

import { GhostSegmentedControl, GhostSegmentedControlItem } from '@ghostvue/vue'

const view = ref('list')
</script>

<template>
  <GhostSegmentedControl v-model="view" aria-label="Content view">
    <GhostSegmentedControlItem value="list">List</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="grid">Grid</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="board">Board</GhostSegmentedControlItem>
  </GhostSegmentedControl>
</template>

<style scoped>
/*
 * Headless path ships no visuals; this is consumer CSS for the sample. Items
 * share equal columns so the indicator can slide from the CSS variables the
 * library sets. The indicator renders inside GhostSegmentedControl, so scoped
 * CSS needs :deep(). Highlight follows light and dark mode without a theme.
 */
.ghost-segmented-control {
  display: inline-grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  padding-block-end: 0.375rem;
  position: relative;
}

.ghost-segmented-control :deep([data-part='indicator']) {
  background: Highlight;
  block-size: 0.1875rem;
  border-radius: 999px;
  inline-size: calc(100% / var(--ghost-segmented-item-count));
  inset-block-end: 0;
  inset-inline-start: calc(
    100% * var(--ghost-segmented-selected-index) /
      var(--ghost-segmented-item-count)
  );
  pointer-events: none;
  position: absolute;
}

.ghost-segmented-control
  :deep([data-part='indicator'][data-indicator-visible='false']) {
  display: none;
}
</style>
