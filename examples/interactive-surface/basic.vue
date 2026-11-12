<script setup lang="ts">
import { GhostInteractiveSurface } from '@ghostvue/themes'
</script>

<template>
  <GhostInteractiveSurface class="report-card">
    <p class="report-card__title">Quarterly report</p>
    <p class="report-card__copy">
      The glow follows the pointer. Copy stays readable without it.
    </p>
  </GhostInteractiveSurface>
</template>

<style scoped>
.report-card {
  min-block-size: 8rem;
  padding: var(--ghost-space-inset-md, 1.25rem);
}

.report-card__title,
.report-card__copy {
  margin: 0;
}

.report-card__title {
  font-size: 1.15rem;
  font-weight: 650;
}

.report-card__copy {
  color: var(--ghost-text-muted, CanvasText);
}
</style>
