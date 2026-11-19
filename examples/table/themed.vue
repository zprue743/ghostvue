<script setup lang="ts">
import { GhostTable } from '@ghostvue/themes'
import {
  GhostTableBody,
  GhostTableCaption,
  GhostTableCell,
  GhostTableFoot,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
} from '@ghostvue/vue'

// Deterministic local data; totals are derived so the footer always agrees.
const seats = [
  { team: 'Design', used: 8, total: 10 },
  { team: 'Engineering', used: 24, total: 30 },
  { team: 'Support', used: 6, total: 6 },
] as const

const usedTotal = seats.reduce((sum, row) => sum + row.used, 0)
const seatTotal = seats.reduce((sum, row) => sum + row.total, 0)
</script>

<template>
  <div class="seats">
    <GhostTable>
      <GhostTableCaption>Seat usage by team</GhostTableCaption>
      <GhostTableHead>
        <GhostTableRow>
          <GhostTableHeaderCell scope="col">Team</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col" class="seats__number">
            Used
          </GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col" class="seats__number">
            Seats
          </GhostTableHeaderCell>
        </GhostTableRow>
      </GhostTableHead>
      <GhostTableBody>
        <GhostTableRow v-for="row in seats" :key="row.team">
          <GhostTableHeaderCell scope="row">{{
            row.team
          }}</GhostTableHeaderCell>
          <GhostTableCell class="seats__number">{{ row.used }}</GhostTableCell>
          <GhostTableCell class="seats__number">{{ row.total }}</GhostTableCell>
        </GhostTableRow>
      </GhostTableBody>
      <GhostTableFoot>
        <GhostTableRow>
          <GhostTableHeaderCell scope="row">Total</GhostTableHeaderCell>
          <GhostTableCell class="seats__number">{{ usedTotal }}</GhostTableCell>
          <GhostTableCell class="seats__number">{{ seatTotal }}</GhostTableCell>
        </GhostTableRow>
      </GhostTableFoot>
    </GhostTable>
  </div>
</template>

<style scoped>
/* A compact summary table; the recipe fills whatever width it is given. */
.seats {
  max-inline-size: 28rem;
}

/* Numbers align on the end edge and use tabular figures so digits line up. */
.seats__number {
  font-variant-numeric: var(--ghost-type-numeric-tabular);
  text-align: end;
}
</style>
