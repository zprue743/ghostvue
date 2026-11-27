<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostButton,
  GhostDataTable,
  GhostDataTablePreset,
  GhostPagination,
  defineDataTableColumns,
  type DataTableRowId,
} from '@ghostvue/themes'

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
const invoices: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
  { id: 'inv-4', customer: 'Umbrella', amount: 310 },
  { id: 'inv-5', customer: 'Hooli', amount: 75.25 },
  { id: 'inv-6', customer: 'Stark Industries', amount: 5400 },
]

const globalFilter = ref('')
const selectedRowIds = ref<DataTableRowId[]>(['inv-2'])
const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
const pagination = ref({ pageIndex: 1, pageSize: 3 })
const loading = ref(false)
</script>

<template>
  <GhostDataTable
    v-model:global-filter="globalFilter"
    v-model:selected-row-ids="selectedRowIds"
    v-model:expanded-row-ids="expandedRowIds"
    v-model:pagination="pagination"
    :data="invoices"
    :columns="columns"
    :get-row-id="(row) => row.id"
    :loading="loading"
    enable-row-selection
    enable-row-expansion
    sticky-header
    size="sm"
    variant="card"
    aria-label="Invoices"
  >
    <GhostDataTablePreset
      :columns="columns"
      :layout-slots="['toolbarStart', 'toolbarEnd', 'bulkActions', 'footer']"
      contain-horizontal
      scroll-label="Invoice table"
      empty-title="No matching invoices"
      :empty-heading-level="2"
      search-label="Search invoices"
    >
      <template #toolbarStart>
        <GhostButton
          size="sm"
          tone="neutral"
          variant="outline"
          @click="globalFilter = ''"
        >
          Clear search
        </GhostButton>
      </template>
      <template #toolbarEnd>
        <GhostButton
          size="sm"
          tone="neutral"
          variant="outline"
          :aria-pressed="loading"
          @click="loading = !loading"
        >
          Simulate refresh
        </GhostButton>
      </template>
      <template #bulkActions="{ selectedCount, clearSelection }">
        <span>{{ selectedCount }} selected</span>
        <GhostButton
          size="sm"
          tone="neutral"
          variant="outline"
          @click="clearSelection"
        >
          Clear selection
        </GhostButton>
      </template>
      <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
      <template #detail="{ row, rowId }">
        {{ row.id }} was billed to {{ row.customer }}.
        <GhostButton
          size="sm"
          variant="outline"
          tone="neutral"
          @click="expandedRowIds = expandedRowIds.filter((id) => id !== rowId)"
        >
          Hide invoice details
        </GhostButton>
      </template>
      <template
        #footer="{ pagination: page, pageCount, rowCount, setPageIndex }"
      >
        <span>{{ rowCount }} invoices</span>
        <GhostPagination
          size="sm"
          :model-value="page.pageIndex"
          :page-count="pageCount"
          aria-label="Invoice pages"
          @update:model-value="setPageIndex"
        />
      </template>
    </GhostDataTablePreset>
  </GhostDataTable>
</template>
