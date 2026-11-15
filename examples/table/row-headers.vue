<script setup lang="ts">
import {
  GhostTable,
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
} from '@ghostvue/vue'
</script>

<template>
  <GhostTable>
    <GhostTableHead>
      <GhostTableRow>
        <GhostTableHeaderCell scope="col">Metric</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Value</GhostTableHeaderCell>
      </GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <GhostTableRow>
        <GhostTableHeaderCell scope="row">Uptime</GhostTableHeaderCell>
        <GhostTableCell>99.97%</GhostTableCell>
      </GhostTableRow>
      <GhostTableRow>
        <GhostTableHeaderCell scope="row">Latency p95</GhostTableHeaderCell>
        <GhostTableCell>42 ms</GhostTableCell>
      </GhostTableRow>
    </GhostTableBody>
  </GhostTable>
</template>
