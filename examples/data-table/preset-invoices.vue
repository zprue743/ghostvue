<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostDataTable,
  GhostDataTablePreset,
  GhostPagination,
  defineDataTableColumns,
  type DataTableRowId,
} from '@ghostvue/vue'

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

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
  { id: 'inv-4', customer: 'Umbrella', amount: 310 },
  { id: 'inv-5', customer: 'Hooli', amount: 75.25 },
  { id: 'inv-6', customer: 'Stark Industries', amount: 5400 },
])

const globalFilter = ref('')
const selectedRowIds = ref<DataTableRowId[]>(['inv-2'])
const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
const pagination = ref({ pageIndex: 1, pageSize: 5 })
</script>

<template>
  <div class="preset-invoices">
    <GhostDataTable
      v-model:global-filter="globalFilter"
      v-model:selected-row-ids="selectedRowIds"
      v-model:expanded-row-ids="expandedRowIds"
      v-model:pagination="pagination"
      :data="data"
      :columns="columns"
      :get-row-id="(row) => row.id"
      :enable-row-selection="true"
      :enable-row-expansion="true"
      aria-label="Invoices"
    >
      <template #default="{ pagination: page, pageCount, setPageIndex }">
        <!-- `columns` types the #amount slot: `value` is a number here. -->
        <GhostDataTablePreset
          :columns="columns"
          empty-title="No invoices"
          :empty-heading-level="2"
          search-label="Search invoices"
        >
          <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
          <template #detail="{ row }">
            {{ row.id }} was billed to {{ row.customer }}.
          </template>
        </GhostDataTablePreset>
        <GhostPagination
          :model-value="page.pageIndex"
          :page-count="pageCount"
          aria-label="Invoice pages"
          @update:model-value="setPageIndex"
        />
      </template>
    </GhostDataTable>
  </div>
</template>

<style scoped>
.preset-invoices {
  display: grid;
  gap: 0.75rem;
}

/* Headless GhostPagination paints nothing; lay the list out in a row. */
.preset-invoices :deep(.ghost-pagination__list) {
  display: flex;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
