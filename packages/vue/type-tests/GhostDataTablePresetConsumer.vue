<script setup lang="ts">
import { ref } from 'vue'

import GhostDataTable from '../src/GhostDataTable.vue'
import GhostDataTablePreset from '../src/GhostDataTablePreset.vue'
import { defineDataTableColumns } from '../src/define-data-table-columns'
import type { DataTableRowId } from '../src/ghost-data-table'

/*
 * GhostDataTablePreset slot and prop types (spec "Default rendering
 * convenience"). Each `@vue-expect-error` fails vue-tsc as an unused
 * directive if the guarded error disappears.
 */

interface Invoice {
  id: string
  customer: string
  amount: number
}

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('customer', { header: 'Customer' }),
  helper.accessorKey('amount', { header: 'Amount' }),
]

const data = ref<Invoice[]>([{ id: 'inv-1', customer: 'ACME', amount: 1 }])

function selectLabel(rowId: DataTableRowId): string {
  return `Pick ${String(rowId)}`
}
</script>

<template>
  <GhostDataTable :data="data" :columns="columns" :get-row-id="(row) => row.id">
    <GhostDataTablePreset
      :columns="columns"
      empty-title="No invoices"
      search-label="Search invoices"
      selection-header-label="Selection"
      expansion-header-label="Details"
      select-all-label="Select every invoice"
      :row-selection-label="selectLabel"
      :show-global-filter="false"
    >
      <!-- Typed cell slots, as on GhostDataTableTable. -->
      <template #amount="{ value }">
        {{ value.toFixed(2) }}
        <!-- @vue-expect-error `amount` is a number. -->
        {{ value.toUpperCase() }}
      </template>
      <!-- The detail row is typed from the column array. -->
      <template #detail="{ row, rowId, rowIndex }">
        {{ row.customer.toUpperCase() }} {{ rowId }} {{ rowIndex.toFixed(0) }}
        <!-- @vue-expect-error `customer` is a string. -->
        {{ row.customer.toFixed(2) }}
      </template>
      <template #toolbar>Toolbar</template>
      <template #search="{ value, setValue, label, disabled }">
        <input
          :value="value.toUpperCase()"
          :aria-label="label"
          :disabled="disabled"
          @input="setValue('next')"
        />
      </template>
    </GhostDataTablePreset>

    <!-- @vue-expect-error emptyTitle is a string. -->
    <GhostDataTablePreset :empty-title="1" />
  </GhostDataTable>
</template>
