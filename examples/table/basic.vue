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
</script>

<template>
  <GhostTable>
    <GhostTableCaption>Q3 2025 invoices</GhostTableCaption>
    <GhostTableHead>
      <GhostTableRow>
        <GhostTableHeaderCell scope="col">Invoice</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Status</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Amount</GhostTableHeaderCell>
      </GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <GhostTableRow>
        <GhostTableCell>INV-1042</GhostTableCell>
        <GhostTableCell>Paid</GhostTableCell>
        <GhostTableCell>$420.00</GhostTableCell>
      </GhostTableRow>
      <GhostTableRow>
        <GhostTableCell>INV-1043</GhostTableCell>
        <GhostTableCell>Due</GhostTableCell>
        <GhostTableCell>$128.50</GhostTableCell>
      </GhostTableRow>
    </GhostTableBody>
  </GhostTable>
</template>
