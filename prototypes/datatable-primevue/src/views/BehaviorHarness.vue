<script setup lang="ts">
/**
 * Programmatic harness exposed on `window.__behaviorHarness` for Playwright
 * behavior-parity checks (selection scope, stateChange, pagination rules).
 */
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { DataTableStateChangePayload } from '../ghostvue/types'
import { useGhostDataTable } from '../ghostvue/useGhostDataTable'
import { defineDataTableColumns } from '../ghostvue/defineDataTableColumns'
import type { Invoice } from '../data/invoices'

type Mode =
  | 'local-full'
  | 'server-page-local-filter'
  | 'server-manual-filter'

const props = defineProps<{ mode?: Mode }>()

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('customer', { header: 'Customer', enableSorting: true }),
  helper.accessorKey('amount', { header: 'Amount', enableSorting: true }),
]

const allRows = ref<Invoice[]>(
  Array.from({ length: 100 }, (_, i) => ({
    id: `inv-${i + 1}`,
    customer: `Customer ${i + 1}`,
    amount: i * 10,
  })),
)

const mode = props.mode ?? 'local-full'
const isManualPagination = mode !== 'local-full'
const isManualFiltering = mode === 'server-manual-filter'

const pageData = ref<Invoice[]>([])
const rowCount = ref(100)
const globalFilter = ref('')
const pagination = ref({ pageIndex: 4, pageSize: 25 })
const selectedRowIds = ref<(string | number)[]>([])
const stateChanges = shallowRef<DataTableStateChangePayload[]>([])

function refreshPageSlice() {
  const start = (pagination.value.pageIndex - 1) * pagination.value.pageSize
  pageData.value = allRows.value.slice(start, start + pagination.value.pageSize)
}

refreshPageSlice()

const data = computed(() => (isManualPagination ? pageData.value : allRows.value))

const table = useGhostDataTable({
  data,
  columns,
  getRowId: (row) => row.id,
  manualPagination: isManualPagination,
  manualFiltering: isManualFiltering,
  rowCount: computed(() => (isManualPagination ? rowCount.value : undefined)),
  globalFilter,
  pagination,
  selectedRowIds,
  enableRowSelection: true,
  onStateChange: (payload) => {
    stateChanges.value = [...stateChanges.value, payload]
    if (isManualPagination) {
      refreshPageSlice()
    }
  },
})

function exportApi() {
  return {
    mode: props.mode ?? 'local-full',
    setGlobalFilter: (value: string) => {
      table.globalFilter.value = value
    },
    toggleSelectAll: () => table.toggleAllRowsSelected(),
    getSelectedIds: () => [...table.selectedRowIds.value],
    getPrePaginationCount: () => table.getPrePaginationRowModel().length,
    getVisibleCount: () => table.getRowModel().length,
    getPageIndex: () => table.pagination.value.pageIndex,
    getStateChangeCount: () => stateChanges.value.length,
    getLastStateChange: () => stateChanges.value.at(-1) ?? null,
    setPage: (pageIndex: number) => {
      pagination.value = { ...pagination.value, pageIndex }
      refreshPageSlice()
    },
    clearStateLog: () => {
      stateChanges.value = []
    },
  }
}

onMounted(() => {
  ;(window as unknown as { __behaviorHarness: ReturnType<typeof exportApi> }).__behaviorHarness =
    exportApi()
})
</script>

<template>
  <div data-testid="behavior-harness" aria-hidden="true" />
</template>