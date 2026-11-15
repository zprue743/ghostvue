<script setup lang="ts">
import { GhostTable } from '@ghostvue/themes'
import {
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
    <GhostTableCaption>Team roster</GhostTableCaption>
    <GhostTableHead>
      <GhostTableRow>
        <GhostTableHeaderCell scope="col">Name</GhostTableHeaderCell>
        <GhostTableHeaderCell scope="col">Role</GhostTableHeaderCell>
      </GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <GhostTableRow>
        <GhostTableCell>Alex</GhostTableCell>
        <GhostTableCell>Engineering</GhostTableCell>
      </GhostTableRow>
    </GhostTableBody>
  </GhostTable>
</template>
