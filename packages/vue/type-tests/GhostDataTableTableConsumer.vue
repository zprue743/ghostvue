<script setup lang="ts">
import { ref } from 'vue'

import GhostDataTable from '../src/GhostDataTable.vue'
import GhostDataTableTable from '../src/GhostDataTableTable.vue'
import { defineDataTableColumns } from '../src/define-data-table-columns'
import type { DataTableColumnDef } from '../src/ghost-data-table'

/*
 * GhostDataTableTable slot types (spec "GhostDataTableTable slots" and test
 * plan "Vue: ... GhostDataTableTable slot types"). Each `@vue-expect-error`
 * fails vue-tsc as an unused directive if the guarded error disappears.
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
  helper.accessorFn('withTax', {
    header: 'With tax',
    accessorFn: (row) => row.amount * 1.2,
  }),
]

const plainColumns: DataTableColumnDef<Invoice>[] = [
  { id: 'amount', accessorKey: 'amount' },
]

const data = ref<Invoice[]>([{ id: 'inv-1', customer: 'ACME', amount: 1 }])
</script>

<template>
  <GhostDataTable :data="data" :columns="columns" :get-row-id="(row) => row.id">
    <!-- Typed columns: each slot's value comes from its own column. -->
    <GhostDataTableTable :columns="columns">
      <template #amount="{ value, getValue, row, rowId }">
        {{ value.toFixed(2) }} {{ getValue().toFixed(2) }}
        {{ row.customer.toUpperCase() }} {{ rowId }}
        <!-- @vue-expect-error `amount` is a number. -->
        {{ value.toUpperCase() }}
      </template>
      <template #customer="{ value }">
        {{ value.toUpperCase() }}
        <!-- @vue-expect-error `customer` is a string. -->
        {{ value.toFixed(2) }}
      </template>
      <template #withTax="{ value }">
        {{ value.toFixed(2) }}
        <!-- @vue-expect-error the accessorFn returns a number. -->
        {{ value.toUpperCase() }}
      </template>
    </GhostDataTableTable>

    <!-- Hand-written columns keep the generic `unknown` value. -->
    <GhostDataTableTable :columns="plainColumns">
      <template #amount="{ value, getValue }">
        {{ String(value) }}
        <!-- @vue-expect-error generic columns expose `value: unknown`. -->
        {{ value.toFixed(2) }}
        <!-- @vue-expect-error generic columns expose `getValue(): unknown`. -->
        {{ getValue().toFixed(2) }}
      </template>
    </GhostDataTableTable>

    <!-- Without `columns`, any column id is a slot and `value` is unknown. -->
    <GhostDataTableTable>
      <template #amount="{ value }">
        {{ String(value) }}
        <!-- @vue-expect-error no column array, so `value` is unknown. -->
        {{ value.toFixed(2) }}
      </template>
    </GhostDataTableTable>
  </GhostDataTable>
</template>
