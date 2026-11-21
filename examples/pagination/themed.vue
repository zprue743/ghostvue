<script setup lang="ts">
import { computed, ref } from 'vue'

import { GhostCard, GhostPagination } from '@ghostvue/themes'

const pageSize = 10
const totalItems = 80
const page = ref(3)

const rangeLabel = computed(() => {
  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, totalItems)
  return `Showing ${String(start)}–${String(end)} of ${String(totalItems)} invoices`
})
</script>

<template>
  <GhostCard class="invoices-footer">
    <div class="invoices-footer__row">
      <div class="invoices-footer__summary" role="status" aria-live="polite">
        {{ rangeLabel }}
      </div>
      <GhostPagination
        v-model="page"
        :page-count="8"
        size="sm"
        aria-label="Themed invoices"
      />
    </div>
  </GhostCard>
</template>

<style scoped>
.invoices-footer {
  inline-size: 100%;
  max-inline-size: 40rem;
}

.invoices-footer__row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: space-between;
}

.invoices-footer__summary {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  font-variant-numeric: tabular-nums;
}
</style>
