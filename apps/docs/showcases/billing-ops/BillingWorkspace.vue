<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import {
  CalendarDate,
  GhostBadge,
  GhostButton,
  GhostDataTable,
  GhostDataTablePreset,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  GhostDrawer,
  GhostDropdownMenu,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuTrigger,
  GhostInput,
  GhostPagination,
  GhostSegmentedControl,
  GhostSegmentedControlItem,
  defineDataTableColumns,
  useGhostToast,
  type DataTableRowId,
  type DataTableColumnSort,
  type GhostDataTableThemedExposed,
  type GhostDatePickerValue,
  type GhostInputExposed,
} from '@ghostvue/themes'

import InvoiceInspector from './InvoiceInspector.vue'
import {
  formatAmount,
  formatIssued,
  initialInvoices,
  invoiceCsv,
  invoiceStatuses,
  type Invoice,
  type InvoiceStatus,
} from './invoices'
import './billing-ops.css'

const { toast } = useGhostToast()
const invoices = shallowRef(initialInvoices)
const table =
  useTemplateRef<GhostDataTableThemedExposed<Invoice>>('invoiceTable')
const searchField = useTemplateRef<GhostInputExposed>('searchField')
const search = ref('')
const sorting = ref<DataTableColumnSort[]>([])
const status = ref<string | undefined>('All')
const dateRange = shallowRef<GhostDatePickerValue>(null)
const selectedRowIds = ref<DataTableRowId[]>([])
const pagination = ref({ pageIndex: 1, pageSize: 4 })
const inspectedId = ref<string>()
const inspectorOpen = ref(false)
let inspectorOpener: HTMLElement | null = null
const prefix = useId()
const calendarToday = new CalendarDate(2026, 11, 18)

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('id', { header: 'Invoice' }),
  helper.accessorKey('customer', { header: 'Customer' }),
  helper.accessorKey('issued', { header: 'Issued' }),
  helper.accessorKey('status', { header: 'Status' }),
  helper.accessorKey('amountCents', { header: 'Amount' }),
  helper.accessorFn('actions', {
    accessorFn: () => '',
    header: 'Actions',
    enableSorting: false,
    enableColumnFilter: false,
  }),
] as const

const sortDescription = computed(() => {
  const sort = sorting.value[0]
  if (!sort) return undefined
  const heading = columns.find((column) => column.id === sort.id)?.header
  return heading
    ? `Sorted by ${heading}, ${sort.desc ? 'descending' : 'ascending'}`
    : undefined
})

const visibleInvoices = computed(() => {
  const range = dateRange.value
  const start = range && 'start' in range ? range.start.toString() : undefined
  const end = range && 'end' in range ? range.end.toString() : undefined
  return invoices.value.filter(
    (invoice) =>
      (status.value === 'All' || invoice.status === status.value) &&
      (start === undefined || invoice.issued >= start) &&
      (end === undefined || invoice.issued <= end),
  )
})
const inspected = computed(() =>
  invoices.value.find((invoice) => invoice.id === inspectedId.value),
)
const metrics = computed(() => {
  const totals = { Paid: 0, 'Past due': 0, Draft: 0, Refunded: 0 }
  for (const invoice of invoices.value)
    totals[invoice.status] += invoice.amountCents
  return [
    { label: 'Paid', amount: totals.Paid },
    { label: 'Past due', amount: totals['Past due'] },
    { label: 'Drafts', amount: totals.Draft },
  ]
})
const payableIds = computed(() => {
  const selected = new Set(selectedRowIds.value)
  return invoices.value
    .filter(
      (invoice) =>
        selected.has(invoice.id) &&
        (invoice.status === 'Draft' || invoice.status === 'Past due'),
    )
    .map((invoice) => invoice.id)
})

watch([search, status, dateRange], () => {
  if (pagination.value.pageIndex !== 1)
    pagination.value = { ...pagination.value, pageIndex: 1 }
})

function tone(value: InvoiceStatus) {
  if (value === 'Paid') return 'accent'
  return value === 'Past due' ? 'danger' : 'neutral'
}

async function clearFilters(): Promise<void> {
  search.value = ''
  status.value = 'All'
  dateRange.value = null
  await nextTick()
  searchField.value?.focus()
}

async function inspect(
  invoice: Invoice,
  trigger: EventTarget | null,
): Promise<void> {
  // Wait for a row menu to finish closing so the drawer records its trigger.
  await nextTick()
  inspectorOpener = trigger instanceof HTMLElement ? trigger : null
  inspectorOpener?.focus({ preventScroll: true })
  inspectedId.value = invoice.id
  inspectorOpen.value = true
}

function inspectFromMenu(invoice: Invoice): void {
  void inspect(invoice, document.getElementById(`${prefix}-menu-${invoice.id}`))
}

async function setInspectorOpen(open: boolean): Promise<void> {
  inspectorOpen.value = open
  if (open) return
  const opener = inspectorOpener
  inspectorOpener = null
  await nextTick()
  // A refund can remove the opener from the filtered table while the drawer
  // still owns focus. Wait for the drawer to release the workspace first.
  if (
    !inspectorOpen.value &&
    !opener?.isConnected &&
    document.activeElement === document.body
  ) {
    searchField.value?.focus()
  }
}

function markPaid(): void {
  const ids = new Set(payableIds.value)
  if (!ids.size) return
  invoices.value = invoices.value.map((invoice) =>
    ids.has(invoice.id) ? { ...invoice, status: 'Paid' } : invoice,
  )
  toast({
    title:
      ids.size === 1
        ? 'Invoice marked paid'
        : `${String(ids.size)} invoices marked paid`,
  })
}

function refundInvoice(id: string): void {
  invoices.value = invoices.value.map((invoice) =>
    invoice.id === id && invoice.status === 'Paid'
      ? { ...invoice, status: 'Refunded' }
      : invoice,
  )
  toast({ title: 'Refund recorded', description: `Invoice ${id}` })
}

function exportInvoices(): void {
  const rows =
    table.value?.getPrePaginationRowModel().map((entry) => entry.row) ?? []
  const url = URL.createObjectURL(
    new Blob([invoiceCsv(rows)], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'invoices.csv'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
  toast({
    title: 'Invoices exported',
    description: `${String(rows.length)} ${rows.length === 1 ? 'invoice' : 'invoices'} in the CSV`,
  })
}
</script>

<template>
  <section class="billing-workspace" aria-labelledby="billing-workspace-title">
    <header class="billing-workspace__heading">
      <div>
        <h2 id="billing-workspace-title">Invoices</h2>
        <p>Review balances, collect payments, and manage refunds.</p>
      </div>
      <GhostButton variant="outline" size="sm" @click="exportInvoices"
        >Export CSV</GhostButton
      >
    </header>

    <dl class="billing-metrics">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="billing-metrics__item"
      >
        <dt>{{ metric.label }}</dt>
        <dd class="billing-amount">{{ formatAmount(metric.amount) }}</dd>
      </div>
    </dl>

    <GhostDataTable
      ref="invoiceTable"
      v-model:global-filter="search"
      v-model:sorting="sorting"
      v-model:pagination="pagination"
      v-model:selected-row-ids="selectedRowIds"
      :data="visibleInvoices"
      :columns="columns"
      :get-row-id="(row) => row.id"
      enable-row-selection
      size="sm"
      variant="card"
      aria-label="Invoices"
    >
      <GhostDataTablePreset
        :columns="columns"
        :layout-slots="['toolbarStart', 'toolbarEnd', 'bulkActions', 'footer']"
        contain-horizontal
        scroll-label="Invoices table scroll region"
        empty-title="No matching invoices"
      >
        <template #toolbarStart>
          <GhostSegmentedControl
            v-model="status"
            class="billing-status-filter"
            :deselectable="false"
            aria-label="Invoice status"
          >
            <GhostSegmentedControlItem
              v-for="value in invoiceStatuses"
              :key="value"
              :value="value"
            >
              {{ value }}
            </GhostSegmentedControlItem>
          </GhostSegmentedControl>
        </template>
        <template #search="{ value, setValue, disabled }">
          <label class="billing-search">
            <span>Search invoices</span>
            <GhostInput
              ref="searchField"
              type="search"
              :model-value="value"
              :disabled="disabled"
              placeholder="Invoice or customer"
              @update:model-value="setValue"
            />
          </label>
        </template>
        <template #toolbarEnd>
          <GhostDatePicker
            v-model="dateRange"
            selection-mode="range"
            :today="calendarToday"
          >
            <div
              class="billing-date-filter"
              role="group"
              aria-label="Invoice issue dates"
            >
              <label>
                <span>From</span>
                <GhostDatePickerInput part="start" placeholder="YYYY-MM-DD" />
              </label>
              <label>
                <span>To</span>
                <GhostDatePickerInput part="end" placeholder="YYYY-MM-DD" />
              </label>
              <GhostDatePickerTrigger />
            </div>
            <GhostDatePickerContent />
          </GhostDatePicker>
        </template>
        <template #bulkActions="{ selectedCount, clearSelection }">
          <span>{{ selectedCount }} selected</span>
          <GhostButton
            variant="outline"
            size="sm"
            :aria-disabled="!payableIds.length"
            @click="markPaid"
            >Mark paid</GhostButton
          >
          <GhostButton variant="ghost" size="sm" @click="clearSelection"
            >Clear selection</GhostButton
          >
        </template>
        <template #id="{ row, value }">
          <GhostButton
            class="billing-invoice-id"
            variant="ghost"
            size="sm"
            aria-haspopup="dialog"
            @click="inspect(row, $event.currentTarget)"
          >
            {{ value }}
          </GhostButton>
        </template>
        <template #issued="{ value }">
          <time :datetime="value" class="billing-issued">{{
            formatIssued(value)
          }}</time>
        </template>
        <template #status="{ value }">
          <GhostBadge
            :tone="tone(value)"
            variant="soft"
            size="sm"
            class="billing-status"
            >{{ value }}</GhostBadge
          >
        </template>
        <template #amountCents="{ value }">
          <span class="billing-amount billing-cell-amount">{{
            formatAmount(value)
          }}</span>
        </template>
        <template #actions="{ row }">
          <GhostDropdownMenu>
            <GhostDropdownMenuTrigger
              :id="`${prefix}-menu-${row.id}`"
              :as="GhostButton"
              variant="ghost"
              size="sm"
              :aria-label="`Actions for ${row.id}`"
              >Actions</GhostDropdownMenuTrigger
            >
            <GhostDropdownMenuContent placement="bottom-end">
              <GhostDropdownMenuItem @select="inspectFromMenu(row)"
                >Inspect invoice</GhostDropdownMenuItem
              >
            </GhostDropdownMenuContent>
          </GhostDropdownMenu>
        </template>
        <template
          #footer="{ pagination: page, pageCount, rowCount, setPageIndex }"
        >
          <span class="billing-footer-count" role="status"
            >{{ rowCount }} {{ rowCount === 1 ? 'invoice' : 'invoices' }}
            <span v-if="sortDescription"> · {{ sortDescription }}</span></span
          >
          <GhostButton
            v-if="rowCount === 0"
            variant="outline"
            size="sm"
            @click="clearFilters"
            >Clear filters</GhostButton
          >
          <GhostPagination
            v-else
            :model-value="page.pageIndex"
            :page-count="pageCount"
            size="sm"
            aria-label="Invoice pages"
            @update:model-value="setPageIndex"
          />
        </template>
      </GhostDataTablePreset>
    </GhostDataTable>

    <GhostDrawer :open="inspectorOpen" @update:open="setInspectorOpen">
      <InvoiceInspector
        v-if="inspected"
        :invoice="inspected"
        @refund="refundInvoice"
      />
    </GhostDrawer>
  </section>
</template>
