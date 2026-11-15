<script setup lang="ts">
import {
  useGhostTable,
  useGhostTableBody,
  useGhostTableCell,
  useGhostTableHead,
  useGhostTableHeaderCell,
  useGhostTableRow,
} from '@ghostvue/vue'

const { tableProps } = useGhostTable()
const { rootProps: headProps } = useGhostTableHead()
const { rootProps: bodyProps } = useGhostTableBody()
const { rootProps: rowProps } = useGhostTableRow()
const { rootProps: nameHeaderProps } = useGhostTableHeaderCell({
  scope: () => 'col',
})
const { rootProps: seatsHeaderProps } = useGhostTableHeaderCell({
  scope: () => 'col',
})
const { rootProps: cellProps } = useGhostTableCell()
</script>

<template>
  <table v-bind="tableProps">
    <thead v-bind="headProps">
      <tr v-bind="rowProps">
        <th v-bind="nameHeaderProps">Plan</th>
        <th v-bind="seatsHeaderProps">Seats</th>
      </tr>
    </thead>
    <tbody v-bind="bodyProps">
      <tr v-bind="rowProps">
        <td v-bind="cellProps">Pro</td>
        <td v-bind="cellProps">12</td>
      </tr>
    </tbody>
  </table>
</template>
