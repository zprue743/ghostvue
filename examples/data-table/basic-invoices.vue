<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  GhostDataTable,
  GhostDataTableTable,
  GhostPagination,
  defineDataTableColumns,
} from '@ghostvue/vue'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('customer', { header: 'Customer', enableSorting: true }),
  helper.accessorKey('amount', { header: 'Amount', enableSorting: true }),
]

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
])

const pagination = ref({ pageIndex: 1, pageSize: 25 })
const sorting = ref<{ id: string; desc: boolean }[]>([])

const pageCount = computed(() =>
  Math.max(1, Math.ceil(data.value.length / pagination.value.pageSize)),
)
</script>

<template>
  <div>
    <GhostDataTable
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      :data="data"
      :columns="columns"
      :get-row-id="(row) => row.id"
      aria-label="Invoices"
    >
      <!-- `columns` types the #amount slot: `value` is a number here. -->
      <GhostDataTableTable :columns="columns">
        <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
      </GhostDataTableTable>
      <GhostPagination v-model="pagination.pageIndex" :page-count="pageCount" />
    </GhostDataTable>
  </div>
</template>
