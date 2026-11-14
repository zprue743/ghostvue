<script setup lang="ts">
import { GhostProgress } from '@ghostvue/vue'
</script>

<template>
  <GhostProgress label="Preparing export" />
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

.ghost-progress [data-part='indicator'] {
  background: CanvasText;
  block-size: 100%;
  /* Headless path has no recipe animation; 40% is a static unknown-value stand-in. */
  inline-size: 40%;
}
</style>
