<script setup lang="ts">
import { useGhostProgress } from '@ghostvue/vue'

const { rootProps, indicatorProps } = useGhostProgress({
  label: 'Uploading report',
  value: 40,
})
</script>

<template>
  <div v-bind="rootProps">
    <div v-bind="indicatorProps" />
  </div>
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
}
</style>
