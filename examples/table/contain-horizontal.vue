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
  <GhostTable contain-horizontal data-testid="table-wide">
    <GhostTableHead>
      <GhostTableRow>
        <GhostTableHeaderCell scope="col">ID</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">
          Long column label for overflow demo
        </GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Owner</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Region</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Updated</GhostTableHeaderCell>
      </GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <GhostTableRow>
        <GhostTableCell>svc-01</GhostTableCell>
        <GhostTableCell>Production API gateway routing policy</GhostTableCell>
        <GhostTableCell>platform</GhostTableCell>
        <GhostTableCell>us-east</GhostTableCell>
        <GhostTableCell>2025-11-01</GhostTableCell>
      </GhostTableRow>
    </GhostTableBody>
  </GhostTable>
</template>
