<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue'
import {
  GhostBadge,
  GhostButton,
  GhostDataTable,
  GhostDataTablePreset,
  GhostInput,
  GhostPagination,
  defineDataTableColumns,
  type DataTableRowId,
  type GhostInputExposed,
} from '@ghostvue/themes'

type InvoiceStatus = 'Paid' | 'Open' | 'Overdue'

interface Invoice {
  id: string
  customer: string
  email: string
  /** ISO date, so the column sorts chronologically as text. */
  due: string
  status: InvoiceStatus
  /** US dollars. Format for display; sort and filter on the number. */
  amount: number
}

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('id', { header: 'Invoice' }),
  helper.accessorKey('customer', { header: 'Customer' }),
  helper.accessorKey('due', { header: 'Due' }),
  helper.accessorKey('status', { header: 'Status' }),
  helper.accessorKey('amount', { header: 'Amount' }),
]

// Rows are replaced, never mutated, so the table sees each update.
const invoices = shallowRef<readonly Invoice[]>([
  {
    id: 'INV-1048',
    customer: 'Northstar Studio',
    email: 'billing@northstar.example',
    due: '2026-12-18',
    status: 'Open',
    amount: 2480,
  },
  {
    id: 'INV-1047',
    customer: 'Fieldwork Labs',
    email: 'billing@fieldwork.example',
    due: '2026-11-15',
    status: 'Overdue',
    amount: 3725,
  },
  {
    id: 'INV-1046',
    customer: 'Canopy Digital',
    email: 'accounts@canopy.example',
    due: '2026-12-14',
    status: 'Paid',
    amount: 1560,
  },
  {
    id: 'INV-1045',
    customer: 'Harbor & Co.',
    email: 'billing@harbor.example',
    due: '2026-11-12',
    status: 'Overdue',
    amount: 980.5,
  },
  {
    id: 'INV-1044',
    customer: 'Summit Supply',
    email: 'accounts@summit.example',
    due: '2026-12-10',
    status: 'Paid',
    amount: 2140,
  },
  {
    id: 'INV-1043',
    customer: 'Lumen Works',
    email: 'accounts@lumen.example',
    due: '2026-12-08',
    status: 'Open',
    amount: 1260,
  },
  {
    id: 'INV-1042',
    customer: 'Orbit Analytics',
    email: 'finance@orbit.example',
    due: '2026-12-05',
    status: 'Paid',
    amount: 4200,
  },
  {
    id: 'INV-1041',
    customer: 'Juniper Health',
    email: 'billing@juniper.example',
    due: '2026-12-02',
    status: 'Open',
    amount: 645.75,
  },
])

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})
// The due dates are calendar days, so format them in UTC to avoid a shift.
const dueDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const globalFilter = ref('')
// Start with the two overdue invoices on page 1 selected, ready to collect.
const selectedRowIds = ref<DataTableRowId[]>(['INV-1047', 'INV-1045'])
const expandedRowIds = ref<DataTableRowId[]>(['INV-1047'])
const pagination = ref({ pageIndex: 1, pageSize: 4 })
const saving = ref(false)
const notice = ref('')
const searchField = useTemplateRef<GhostInputExposed>('searchField')

const payableIds = computed(() => {
  const selected = new Set(selectedRowIds.value)
  return invoices.value
    .filter((invoice) => selected.has(invoice.id) && invoice.status !== 'Paid')
    .map((invoice) => invoice.id)
})

function tone(status: InvoiceStatus) {
  if (status === 'Paid') return 'accent'
  return status === 'Overdue' ? 'danger' : 'neutral'
}

async function markPaid(): Promise<void> {
  const ids = new Set(payableIds.value)
  if (!ids.size || saving.value) return
  saving.value = true
  // Stands in for a request to your billing API; `loading` marks the table busy.
  await new Promise((resolve) => setTimeout(resolve, 600))
  invoices.value = invoices.value.map((invoice) =>
    ids.has(invoice.id) ? { ...invoice, status: 'Paid' } : invoice,
  )
  // The preset returns focus to "Select all rows" when the bar closes.
  selectedRowIds.value = []
  saving.value = false
  notice.value =
    ids.size === 1
      ? '1 invoice marked paid'
      : `${String(ids.size)} invoices marked paid`
}

async function clearSearch(): Promise<void> {
  globalFilter.value = ''
  // The button that ran this unmounts with the empty result; keep focus.
  await nextTick()
  searchField.value?.focus()
}
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
    :loading="saving"
    enable-row-selection
    enable-row-expansion
    sticky-header
    size="sm"
    variant="card"
    aria-label="Invoices"
  >
    <GhostDataTablePreset
      :columns="columns"
      :layout-slots="['bulkActions', 'footer']"
      contain-horizontal
      scroll-label="Invoice table"
      empty-title="No matching invoices"
      :empty-heading-level="2"
      search-label="Search invoices"
    >
      <template #search="{ value, setValue, label, disabled }">
        <label>
          <span>{{ label }}</span>
          <GhostInput
            ref="searchField"
            type="search"
            size="sm"
            placeholder="Customer or invoice"
            :model-value="value"
            :disabled="disabled"
            @update:model-value="setValue"
          />
        </label>
      </template>
      <template #bulkActions="{ selectedCount, clearSelection }">
        <span>{{ selectedCount }} selected</span>
        <GhostButton
          size="sm"
          :loading="saving"
          :disabled="!payableIds.length"
          @click="markPaid"
        >
          Mark paid
        </GhostButton>
        <GhostButton
          size="sm"
          tone="neutral"
          variant="ghost"
          @click="clearSelection"
        >
          Clear selection
        </GhostButton>
      </template>
      <template #due="{ value }">
        <time :datetime="value">{{ dueDate.format(new Date(value)) }}</time>
      </template>
      <template #status="{ value }">
        <GhostBadge :tone="tone(value)" variant="soft" size="sm">
          {{ value }}
        </GhostBadge>
      </template>
      <template #amount="{ value }">
        <span class="invoice-amount">{{ currency.format(value) }}</span>
      </template>
      <template #detail="{ row, rowId }">
        <div class="invoice-detail">
          <span>
            {{ row.id }} for {{ row.customer }} is due
            {{ dueDate.format(new Date(row.due)) }}. Billing contact:
            {{ row.email }}.
          </span>
          <GhostButton
            size="sm"
            variant="outline"
            tone="neutral"
            @click="
              expandedRowIds = expandedRowIds.filter((id) => id !== rowId)
            "
          >
            Hide details
          </GhostButton>
        </div>
      </template>
      <template
        #footer="{ pagination: page, pageCount, rowCount, setPageIndex }"
      >
        <!-- One polite region reports search results and saved actions. -->
        <span role="status">
          {{ rowCount }} {{ rowCount === 1 ? 'invoice' : 'invoices' }}
          <template v-if="notice">· {{ notice }}</template>
        </span>
        <GhostButton
          v-if="rowCount === 0"
          size="sm"
          tone="neutral"
          variant="outline"
          @click="clearSearch"
        >
          Clear search
        </GhostButton>
        <GhostPagination
          v-else
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

<style scoped>
/* Tabular figures keep the decimal places aligned down the column. */
.invoice-amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.invoice-detail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ghost-space-gap-sm);
}
</style>
