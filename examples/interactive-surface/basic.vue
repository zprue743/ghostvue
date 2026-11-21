<script setup lang="ts">
import { GhostInteractiveSurface } from '@ghostvue/themes'
</script>

<template>
  <div class="surface-basic-example">
    <GhostInteractiveSurface class="report-card">
      <span class="report-card__title">Quarterly report</span>
      <span class="report-card__copy">
        The glow follows the pointer. Copy stays readable without it.
      </span>
    </GhostInteractiveSurface>
  </div>
</template>

<style scoped>
.surface-basic-example {
  display: grid;
}

.report-card {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-block-size: 8rem;
  padding: var(--ghost-space-inset-md);
}

.report-card__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.report-card__copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}
</style>
