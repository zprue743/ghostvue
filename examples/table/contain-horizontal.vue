<script setup lang="ts">
import {
  GhostTable,
  GhostTableBody,
  GhostTableCaption,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
} from '@ghostvue/vue'

// Deterministic local data with long values, so the table is wider than its frame.
const deployments = [
  {
    service: 'billing-api',
    route: 'POST /v2/invoices/{invoiceId}/finalize',
    owner: 'Payments platform',
    region: 'eu-west-1',
    updated: '2026-11-18',
  },
  {
    service: 'search-indexer',
    route: 'PUT /v1/indexes/{indexName}/documents',
    owner: 'Discovery',
    region: 'us-east-2',
    updated: '2026-11-17',
  },
] as const
</script>

<template>
  <!--
    The frame is narrower than the table on purpose, so the scroll region
    always overflows. The caption names the region (aria-labelledby).
  -->
  <div class="deployments">
    <GhostTable contain-horizontal data-testid="table-wide">
      <GhostTableCaption>Recent deployments</GhostTableCaption>
      <GhostTableHead>
        <GhostTableRow>
          <GhostTableHeaderCell scope="col">Service</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Route</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Owner</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Region</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Updated</GhostTableHeaderCell>
        </GhostTableRow>
      </GhostTableHead>
      <GhostTableBody>
        <GhostTableRow v-for="row in deployments" :key="row.service">
          <GhostTableCell>{{ row.service }}</GhostTableCell>
          <GhostTableCell>{{ row.route }}</GhostTableCell>
          <GhostTableCell>{{ row.owner }}</GhostTableCell>
          <GhostTableCell>{{ row.region }}</GhostTableCell>
          <GhostTableCell>{{ row.updated }}</GhostTableCell>
        </GhostTableRow>
      </GhostTableBody>
    </GhostTable>
  </div>
</template>

<style scoped>
/* Values stay on one line (inherited by the cells); the region scrolls. */
.deployments {
  inline-size: 20rem;
  max-inline-size: 100%;
  white-space: nowrap;
}

/* Native captions center across the full table width; keep it in view. */
.deployments :deep(caption) {
  text-align: start;
}
</style>
