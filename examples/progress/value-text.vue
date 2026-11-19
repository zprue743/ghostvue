<script setup lang="ts">
import { GhostProgress } from '@ghostvue/vue'
</script>

<template>
  <GhostProgress
    label="Uploading files"
    :value="3"
    :max="10"
    value-text="3 of 10 files"
  />
</template>

<style scoped>
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
