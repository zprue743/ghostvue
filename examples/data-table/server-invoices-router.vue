<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
} from 'vue'
import {
  GhostButton,
  GhostDataTable,
  GhostEmptyState,
  GhostInlineAlert,
  GhostPagination,
  GhostTable,
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
  useGhostDataTableServerRequest,
  type DataTableColumnDef,
  type DataTableColumnFilter,
  type DataTableColumnSort,
  type DataTablePaginationState,
  type DataTableQueryState,
  type DataTableStateChangePayload,
  type GhostDataTableExposed,
} from '@ghostvue/vue'

type InvoiceStatus = 'paid' | 'open' | 'overdue'

interface Invoice {
  id: string
  customer: string
  status: InvoiceStatus
  amount: number
}

interface InvoicePage {
  rows: Invoice[]
  /** Rows matching the whole query on the server, across every page. */
  total: number
}

/**
 * Router-style access to the query string. With Vue Router, read
 * `route.query`, write with `router.push({ query })`, and call `onChange`
 * from a `watch` on `route.query`; the table code does not change.
 */
interface InvoiceUrl {
  read: () => URLSearchParams
  push: (params: URLSearchParams) => void
  /** Calls `onChange` after Back or Forward. Returns a stop function. */
  listen: (onChange: () => void) => () => void
}

const props = defineProps<{
  /** URL adapter. Defaults to `window.location` and `window.history`. */
  url?: InvoiceUrl
  /** Server call. Defaults to the in-memory demo invoice service. */
  fetchInvoices?: (query: DataTableQueryState) => Promise<InvoicePage>
}>()

const PAGE_SIZE = 5
const STATUSES: readonly InvoiceStatus[] = ['paid', 'open', 'overdue']
const SORTABLE_COLUMNS = new Set(['id', 'customer', 'amount'])
// The only URL keys this table owns; any other parameter is left untouched.
const URL_KEYS = ['sort', 'status', 'page'] as const

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'id', header: 'Invoice', accessorKey: 'id', enableSorting: true },
  {
    id: 'customer',
    header: 'Customer',
    accessorKey: 'customer',
    enableSorting: true,
  },
  { id: 'status', header: 'Status', accessorKey: 'status' },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    enableSorting: true,
    cell: ({ row }) => `${row.amount.toFixed(2)} USD`,
  },
]

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return STATUSES.some((status) => status === value)
}

/* ---------------------------------------------------------------------------
 * Demo server. A real app replaces this with its API call. It answers after
 * SERVER_LATENCY_MS so Back can land while a request is still pending.
 * ------------------------------------------------------------------------- */

const SERVER_LATENCY_MS = 600
const customers = ['ACME Corp', 'Globex', 'Initech', 'Umbrella', 'Hooli']
const invoices: Invoice[] = Array.from({ length: 47 }, (_, index) => ({
  id: `INV-${String(1001 + index)}`,
  customer: customers[index % customers.length] ?? 'ACME Corp',
  status: STATUSES[index % STATUSES.length] ?? 'open',
  amount: 120 + ((index * 7919) % 4800),
}))

function compareInvoices(left: Invoice, right: Invoice, id: string): number {
  if (id === 'amount') return left.amount - right.amount
  if (id === 'customer') return left.customer.localeCompare(right.customer)
  return left.id.localeCompare(right.id)
}

function answerQuery(query: DataTableQueryState): InvoicePage {
  const status = query.columnFilters.find((filter) => filter.id === 'status')
  let rows = isInvoiceStatus(status?.value)
    ? invoices.filter((invoice) => invoice.status === status.value)
    : [...invoices]
  const sort = query.sorting[0]
  if (sort) {
    rows.sort((left, right) => {
      const order = compareInvoices(left, right, sort.id)
      // Ties fall back to the invoice number so pages never overlap.
      const stable = order === 0 ? left.id.localeCompare(right.id) : order
      return sort.desc ? -stable : stable
    })
  }
  const total = rows.length
  const { pageIndex, pageSize } = query.pagination
  rows = rows.slice((pageIndex - 1) * pageSize, pageIndex * pageSize)
  return { rows, total }
}

const failNextRequest = ref(false)

function demoFetchInvoices(query: DataTableQueryState): Promise<InvoicePage> {
  const fail = failNextRequest.value
  failNextRequest.value = false
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) reject(new Error('The invoice service is unavailable (503).'))
      else resolve(answerQuery(query))
    }, SERVER_LATENCY_MS)
  })
}

/* ---------------------------------------------------------------------------
 * URL <-> table query.
 * ------------------------------------------------------------------------- */

function createBrowserUrl(): InvoiceUrl {
  return {
    read: () =>
      new URLSearchParams(
        typeof window === 'undefined' ? '' : window.location.search,
      ),
    push: (params) => {
      const search = params.toString()
      const { pathname, hash } = window.location
      // Keep the host router's entry state (VitePress, an app router) so it
      // treats the new entry like the page it came from.
      window.history.pushState(
        window.history.state,
        '',
        `${pathname}${search ? `?${search}` : ''}${hash}`,
      )
    },
    listen: (onChange) => {
      window.addEventListener('popstate', onChange)
      return () => {
        window.removeEventListener('popstate', onChange)
      }
    },
  }
}

interface UrlState {
  sorting: DataTableColumnSort[]
  columnFilters: DataTableColumnFilter[]
  pageIndex: number
}

/** Unknown or malformed values fall back to the defaults, never throw. */
function parseUrl(params: URLSearchParams): UrlState {
  const sort = params.get('sort') ?? ''
  const desc = sort.startsWith('-')
  const sortId = desc ? sort.slice(1) : sort
  const status = params.get('status')
  const page = Number(params.get('page') ?? '1')
  return {
    sorting: SORTABLE_COLUMNS.has(sortId) ? [{ id: sortId, desc }] : [],
    columnFilters: isInvoiceStatus(status)
      ? [{ id: 'status', value: status }]
      : [],
    pageIndex: Number.isSafeInteger(page) && page > 1 ? page : 1,
  }
}

function serializeQuery(
  current: URLSearchParams,
  query: DataTableQueryState,
): URLSearchParams {
  const params = new URLSearchParams(current)
  for (const key of URL_KEYS) params.delete(key)
  const sort = query.sorting[0]
  if (sort) params.set('sort', `${sort.desc ? '-' : ''}${sort.id}`)
  const status = query.columnFilters.find((filter) => filter.id === 'status')
  if (isInvoiceStatus(status?.value)) params.set('status', status.value)
  if (query.pagination.pageIndex > 1) {
    params.set('page', String(query.pagination.pageIndex))
  }
  return params
}

/* ---------------------------------------------------------------------------
 * Table state and the server loop.
 * ------------------------------------------------------------------------- */

// Adapters are setup-time dependencies, like a router instance.
const url = props.url ?? createBrowserUrl()
const fetchInvoices = props.fetchInvoices ?? demoFetchInvoices

const table = useTemplateRef<GhostDataTableExposed<Invoice>>('table')
const request = useGhostDataTableServerRequest()

const initial = parseUrl(url.read())
const sorting = ref<DataTableColumnSort[]>(initial.sorting)
const columnFilters = ref<DataTableColumnFilter[]>(initial.columnFilters)
const pagination = ref<DataTablePaginationState>({
  pageIndex: initial.pageIndex,
  pageSize: PAGE_SIZE,
})
const data = shallowRef<Invoice[]>([])
const rowCount = ref(0)
const loading = ref(false)
const error = ref<string>()

/*
 * Until the server reports a total, the table would clamp a restored page to
 * the page count it knows (page 1 of 1 before the first response). Assume
 * the restored page exists; the clamp corrects it once the response arrives.
 */
function keepPageInRange(pageIndex: number): void {
  rowCount.value = Math.max(rowCount.value, pageIndex * PAGE_SIZE)
}
keepPageInRange(initial.pageIndex)

// True while the table re-emits a query that came from the URL, so the
// handler fetches it without pushing a duplicate history entry.
let followingUrl = false

/** Spec "Async behavior": only the latest requestId may write. */
async function onStateChange({
  requestId,
  query,
}: DataTableStateChangePayload): Promise<void> {
  request.begin(requestId) // synchronously, before any await
  if (!followingUrl) {
    const current = url.read()
    const next = serializeQuery(current, query)
    // One history entry per committed query; a retry is not a new entry.
    if (next.toString() !== current.toString()) url.push(next)
  }
  loading.value = true
  try {
    const page = await fetchInvoices(query)
    if (!request.isLatest(requestId)) return
    data.value = page.rows
    rowCount.value = page.total
    error.value = undefined
  } catch (cause) {
    if (!request.isLatest(requestId)) return
    // Failed state stays visible (with the last good rows) until a success.
    error.value =
      cause instanceof Error ? cause.message : 'Invoices failed to load.'
  } finally {
    if (request.isLatest(requestId)) loading.value = false
  }
}

/*
 * Applying URL state to the v-models is silent: controlled props never emit
 * stateChange. The consumer then asks for the restored query once, through
 * retry(), so the table mints a newer requestId and any pending response
 * (for example the sort that Back just undid) can no longer apply.
 */
function fetchFromUrl(): void {
  followingUrl = true
  try {
    table.value?.retry()
  } finally {
    followingUrl = false
  }
}

async function restoreFromUrl(): Promise<void> {
  const state = parseUrl(url.read())
  sorting.value = state.sorting
  columnFilters.value = state.columnFilters
  pagination.value = { pageIndex: state.pageIndex, pageSize: PAGE_SIZE }
  keepPageInRange(state.pageIndex)
  // The table reads the restored props on the next render.
  await nextTick()
  fetchFromUrl()
}

function retry(): void {
  table.value?.retry()
}

let stopListening: (() => void) | undefined

onMounted(() => {
  stopListening = url.listen(() => {
    void restoreFromUrl()
  })
  // First entry into the route: hydration emitted nothing, so fetch once.
  fetchFromUrl()
})

onBeforeUnmount(() => {
  stopListening?.()
})

function statusFilterValue(filters: DataTableColumnFilter[]): string {
  const status = filters.find((filter) => filter.id === 'status')?.value
  return isInvoiceStatus(status) ? status : ''
}

function onStatusChange(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return
  // Server filtering: the table resets to page 1 and emits one stateChange.
  table.value?.setColumnFilter('status', event.target.value)
}
</script>

<template>
  <div class="server-invoices">
    <div class="server-invoices__toolbar">
      <label>
        Status
        <select
          :value="statusFilterValue(columnFilters)"
          @change="onStatusChange"
        >
          <option value="">All</option>
          <option v-for="status in STATUSES" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
      </label>
      <label v-if="!props.fetchInvoices">
        <input v-model="failNextRequest" type="checkbox" />
        Fail the next request
      </label>
    </div>

    <GhostInlineAlert v-if="error" :heading-level="2" announce="alert">
      <template #title>Invoices failed to load</template>
      <template #message>{{ error }}</template>
      <template #actions>
        <GhostButton type="button" @click="retry">Retry</GhostButton>
      </template>
    </GhostInlineAlert>

    <GhostDataTable
      ref="table"
      v-model:sorting="sorting"
      v-model:column-filters="columnFilters"
      v-model:pagination="pagination"
      :data="data"
      :columns="columns"
      :get-row-id="(row) => row.id"
      :manual-sorting="true"
      :manual-filtering="true"
      :manual-pagination="true"
      :row-count="rowCount"
      :loading="loading"
      aria-label="Invoices"
      @state-change="onStateChange"
    >
      <template
        #default="{
          tableRootProps,
          headers,
          getHeaderCellProps,
          getSortButtonProps,
          rows,
          getBodyCellContext,
          pagination: page,
          pageCount,
          setPageIndex,
        }"
      >
        <GhostTable v-bind="tableRootProps">
          <GhostTableHead>
            <GhostTableRow>
              <GhostTableHeaderCell
                v-for="header in headers"
                :key="header.id"
                v-bind="getHeaderCellProps(header.id)"
              >
                <button
                  v-if="header.column.enableSorting"
                  v-bind="
                    getSortButtonProps(header.id, {
                      label: `Sort by ${header.column.header}`,
                    })
                  "
                  @click="header.toggleSort"
                >
                  {{ header.column.header }}
                </button>
                <template v-else>{{ header.column.header }}</template>
              </GhostTableHeaderCell>
            </GhostTableRow>
          </GhostTableHead>
          <GhostTableBody>
            <GhostTableRow v-if="rows.length === 0 && !loading">
              <GhostTableCell :colspan="headers.length">
                <GhostEmptyState :heading-level="2">
                  <template #title>No invoices</template>
                </GhostEmptyState>
              </GhostTableCell>
            </GhostTableRow>
            <GhostTableRow v-for="row in rows" :key="row.rowId">
              <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                <template v-if="cell.column.cell">
                  {{
                    cell.column.cell(
                      getBodyCellContext(row.rowId, cell.column.id),
                    )
                  }}
                </template>
                <template v-else>
                  {{ getBodyCellContext(row.rowId, cell.column.id).getValue() }}
                </template>
              </GhostTableCell>
            </GhostTableRow>
          </GhostTableBody>
        </GhostTable>
        <div class="server-invoices__footer">
          <p class="server-invoices__status" role="status">
            <template v-if="loading">Loading invoices…</template>
            <template v-else>
              {{ rowCount }} invoices, page {{ page.pageIndex }} of
              {{ pageCount }}
            </template>
          </p>
          <GhostPagination
            :model-value="page.pageIndex"
            :page-count="pageCount"
            class="server-invoices__pager"
            aria-label="Invoice pages"
            @update:model-value="setPageIndex"
          />
        </div>
      </template>
    </GhostDataTable>
  </div>
</template>

<style scoped>
.server-invoices {
  display: grid;
  gap: 0.75rem;
}

.server-invoices__toolbar,
.server-invoices__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.server-invoices__footer {
  justify-content: space-between;
}

.server-invoices__status {
  margin: 0;
}

/* Headless GhostPagination paints nothing; lay the list out in a row. */
.server-invoices__pager :deep(.ghost-pagination__list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.server-invoices__pager :deep(button) {
  min-inline-size: 2rem;
  padding: 0.25rem 0.5rem;
}

.server-invoices__pager :deep(button[aria-current='page']) {
  background: Highlight;
  color: HighlightText;
}
</style>
