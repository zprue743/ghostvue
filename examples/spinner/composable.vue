<script setup lang="ts">
import { GhostVisuallyHidden, useGhostSpinner } from '@ghostvue/vue'

const { label, rootProps } = useGhostSpinner()
</script>

<template>
  <span v-bind="rootProps">
    <GhostVisuallyHidden>{{ label }}</GhostVisuallyHidden>
  </span>
</template>

<style scoped>
/*
 * Headless path ships no visuals; this is consumer CSS for the sample. System
 * colors follow light and dark mode without a theme.
 */
.ghost-spinner {
  animation: spinner-turn 0.8s linear infinite;
  block-size: 1.25rem;
  border: 2px solid GrayText;
  border-block-start-color: CanvasText;
  border-radius: 50%;
  box-sizing: border-box;
  display: inline-block;
  inline-size: 1.25rem;
  vertical-align: middle;
}

@media (prefers-reduced-motion: reduce) {
  .ghost-spinner {
    animation: none;
  }
}

@keyframes spinner-turn {
  to {
    rotate: 1turn;
  }
}
</style>
