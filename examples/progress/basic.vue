<script setup lang="ts">
import { GhostProgress } from '@ghostvue/vue'
</script>

<template>
  <GhostProgress label="Uploading report" :value="40" />
</template>

<style scoped>
/* Headless path ships no visuals; this is consumer CSS for the sample. */
.ghost-progress {
  background: Canvas;
  block-size: 0.5rem;
  border: 1px solid GrayText;
  border-radius: 999px;
  inline-size: min(100%, 24rem);
  overflow: hidden;
}

/* The indicator renders inside GhostProgress, so scoped CSS needs :deep(). */
.ghost-progress :deep([data-part='indicator']) {
  background: CanvasText;
  block-size: 100%;
}
</style>
