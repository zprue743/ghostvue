<script setup lang="ts">
import { ref } from 'vue'

import GhostDataTable from '../src/GhostDataTable.vue'
import type {
  DataTableColumnDef,
  DataTableRowId,
  DataTableStateChangePayload,
} from '../src/ghost-data-table'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const data = ref<Invoice[]>([{ id: 'inv-1', customer: 'ACME', amount: 1 }])
const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'amount', accessorKey: 'amount' },
]
const selectedRowIds = ref<DataTableRowId[]>([])

function onStateChange(payload: DataTableStateChangePayload): number {
  return payload.requestId
}
</script>

<template>
  <!-- TData is inferred from `data`, so slot rows carry the consumer row type. -->
  <GhostDataTable
    v-model:selected-row-ids="selectedRowIds"
    :data="data"
    :columns="columns"
    :get-row-id="(row) => row.id"
    @state-change="onStateChange"
  >
    <template #default="{ rows, getBodyCellContext, headerSelectionState }">
      <span v-for="row in rows" :key="row.rowId">
        {{ row.row.amount.toFixed(2) }}
        <!-- @vue-expect-error `customer` is a string. -->
        {{ row.row.customer.toFixed(2) }}
        <!-- @vue-expect-error generic cell contexts keep `getValue(): unknown`. -->
        {{ getBodyCellContext(row.rowId, 'amount').getValue().toFixed(2) }}
        {{ headerSelectionState.allSelected }}
      </span>
    </template>
  </GhostDataTable>
</template>
