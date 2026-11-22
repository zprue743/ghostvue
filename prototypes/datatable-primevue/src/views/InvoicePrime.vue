<script setup lang="ts">
import { computed, ref } from 'vue'
import DataTable from 'primevue/datatable'
import type { DataTableSortEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import { approvalFixtureInvoices, type Invoice } from '../data/invoices'

const props = defineProps<{
  data?: Invoice[]
  dataTestId?: string
}>()

const invoices = ref<Invoice[]>([...(props.data ?? approvalFixtureInvoices)])
const selectedRows = ref<Invoice[]>(
  invoices.value.filter((row) => row.id === 'inv-2'),
)
const expandedRows = ref<Invoice[]>(invoices.value.filter((row) => row.id === 'inv-2'))
const globalFilter = ref('')
const sortField = ref<string | undefined>()
const sortOrder = ref<number | undefined>(undefined)

const filteredCount = computed(() => {
  const q = globalFilter.value.trim().toLowerCase()
  if (!q) return invoices.value.length
  return invoices.value.filter((row) =>
  ['customer', 'amount', 'id'].some((key) => {
    const value = (row as Record<string, unknown>)[key]
    if (value == null) return false
    return String(value).toLowerCase().includes(q)
  }),
  ).length
})

function formatAmount(row: Invoice) {
  return `${row.amount.toFixed(2)} USD (${row.customer})`
}

function onSort(event: DataTableSortEvent) {
  sortField.value = typeof event.sortField === 'string' ? event.sortField : undefined
  sortOrder.value = event.sortOrder ?? undefined
}
</script>

<template>
  <div class="screen" :data-testid="dataTestId ?? 'invoice-prime'">
    <h1>PrimeVue DataTable</h1>
    <label class="search">
      Search
      <input v-model="globalFilter" type="search" data-testid="global-filter" />
    </label>
    <DataTable
      v-model:selection="selectedRows"
      v-model:expanded-rows="expandedRows"
      :value="invoices"
      data-key="id"
      :global-filter="globalFilter"
      :global-filter-fields="['customer', 'amount', 'id']"
      sort-mode="single"
      :sort-field="sortField"
      :sort-order="sortOrder"
      removable-sort
      paginator
      :rows="25"
      striped-rows
      data-testid="prime-table"
      @sort="onSort"
    >
      <template #empty>
        <h2>No invoices</h2>
      </template>
      <Column selection-mode="multiple" header-style="width: 3rem" />
      <Column expander style="width: 4rem" />
      <Column field="customer" header="Customer" sortable />
      <Column field="amount" header="Amount" sortable>
        <template #body="{ data }">
          {{ formatAmount(data) }}
        </template>
      </Column>
      <template #expansion="{ data }">
        Details for {{ data.id }}
      </template>
    </DataTable>
    <p class="meta" data-testid="filtered-count">Filtered count (manual): {{ filteredCount }}</p>
  </div>
</template>

<style scoped>
.screen {
  font-family: system-ui, sans-serif;
  max-width: 56rem;
  margin: 0 auto;
  padding: 1rem;
}
.search {
  display: block;
  margin-bottom: 0.75rem;
}
.meta {
  font-size: 0.85rem;
  color: #666;
}
</style>