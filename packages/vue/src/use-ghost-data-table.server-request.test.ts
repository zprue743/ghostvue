import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import {
  defineComponent,
  effectScope,
  h,
  nextTick,
  ref,
  shallowRef,
  type Ref,
  type ShallowRef,
} from 'vue'

import GhostDataTable from './GhostDataTable.vue'
import type {
  DataTableColumnDef,
  DataTablePaginationState,
  DataTableQueryState,
  DataTableStateChangePayload,
  GhostDataTableExposed,
  GhostDataTableSlotProps,
  UseGhostDataTableOptions,
  UseGhostDataTableReturn,
} from './ghost-data-table'
import {
  useGhostDataTable,
  useGhostDataTableServerRequest,
} from './use-ghost-data-table'

/*
 * Race tests for the spec's "Async behavior" and "Server state, URL, Back, and
 * Retry" sections (GHO-239). Server responses are deferred promises resolved
 * by hand, so each test chooses the exact completion order instead of relying
 * on timers.
 */

interface Invoice {
  id: string
  customer: string
}

interface ServerPage {
  rows: Invoice[]
  total: number
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Lets every pending promise callback (try/catch/finally) run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  await nextTick()
}

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
]

const getRowId = (row: Invoice): string => row.id

function page(label: string, count = 3): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${label}-${String(index + 1)}`,
    customer: `${label} customer ${String(index + 1)}`,
  }))
}

interface Request {
  payload: DataTableStateChangePayload
  response: Deferred<ServerPage>
}

interface ServerConsumer {
  data: ShallowRef<Invoice[]>
  rowCount: Ref<number>
  loading: Ref<boolean>
  error: Ref<unknown>
  requests: Request[]
  onStateChange: (payload: DataTableStateChangePayload) => void
}

/**
 * The documented consumer handler (spec "Async behavior" steps 1-4): every
 * write, including the `finally` that clears `loading`, is gated by
 * `isLatest(requestId)`.
 */
function createServerConsumer(initial: ServerPage): ServerConsumer {
  const request = useGhostDataTableServerRequest()
  const data = shallowRef(initial.rows)
  const rowCount = ref(initial.total)
  const loading = ref(false)
  const error = ref<unknown>()
  const requests: Request[] = []

  async function onStateChange(
    payload: DataTableStateChangePayload,
  ): Promise<void> {
    const { requestId } = payload
    request.begin(requestId)
    loading.value = true
    const response = deferred<ServerPage>()
    requests.push({ payload, response })
    try {
      const result = await response.promise
      if (!request.isLatest(requestId)) return
      data.value = result.rows
      rowCount.value = result.total
      error.value = undefined
    } catch (cause) {
      if (request.isLatest(requestId)) error.value = cause
    } finally {
      if (request.isLatest(requestId)) loading.value = false
    }
  }

  return {
    data,
    rowCount,
    loading,
    error,
    requests,
    onStateChange: (payload) => {
      void onStateChange(payload)
    },
  }
}

const scopes: ReturnType<typeof effectScope>[] = []

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  document.body.innerHTML = ''
})

function setupTable(
  options: UseGhostDataTableOptions<Invoice>,
): UseGhostDataTableReturn<Invoice> {
  const scope = effectScope()
  scopes.push(scope)
  const table = scope.run(() => useGhostDataTable(options))
  if (!table) throw new Error('useGhostDataTable did not run')
  return table
}

function serverTable(
  consumer: ServerConsumer,
  defaultPagination: DataTablePaginationState,
): UseGhostDataTableReturn<Invoice> {
  return setupTable({
    data: consumer.data,
    columns,
    getRowId,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    rowCount: consumer.rowCount,
    loading: consumer.loading,
    defaultPagination,
    onStateChange: consumer.onStateChange,
  })
}

function requestAt(consumer: ServerConsumer, index: number): Request {
  const entry = consumer.requests[index]
  if (!entry) throw new Error(`missing request ${String(index)}`)
  return entry
}

describe('useGhostDataTableServerRequest', () => {
  it('treats only the newest begun id as latest', () => {
    const request = useGhostDataTableServerRequest()
    // Nothing begun yet: no table-minted id (they start at 1) is current.
    expect(request.isLatest(1)).toBe(false)
    request.begin(1)
    expect(request.isLatest(1)).toBe(true)
    request.begin(2)
    expect(request.isLatest(1)).toBe(false)
    expect(request.isLatest(2)).toBe(true)
  })

  it('keeps separate guards independent', () => {
    const invoices = useGhostDataTableServerRequest()
    const customers = useGhostDataTableServerRequest()
    invoices.begin(3)
    customers.begin(1)
    expect(invoices.isLatest(3)).toBe(true)
    expect(customers.isLatest(3)).toBe(false)
    expect(customers.isLatest(1)).toBe(true)
  })

  it('ignores a stale response that resolves after the newest one', async () => {
    const consumer = createServerConsumer({ rows: page('p1'), total: 100 })
    const table = serverTable(consumer, { pageIndex: 1, pageSize: 3 })

    table.setPageIndex(2)
    table.setPageIndex(3)
    expect(consumer.requests).toHaveLength(2)
    const [toPage2, toPage3] = [requestAt(consumer, 0), requestAt(consumer, 1)]

    toPage3.response.resolve({ rows: page('p3'), total: 100 })
    await flush()
    expect(consumer.data.value.map((row) => row.id)).toEqual(
      page('p3').map((row) => row.id),
    )
    expect(consumer.loading.value).toBe(false)

    // The older page-2 response lands last; it must not replace page 3.
    toPage2.response.resolve({ rows: page('p2'), total: 90 })
    await flush()
    expect(table.getRowModel().map((row) => row.rowId)).toEqual(
      page('p3').map((row) => row.id),
    )
    expect(consumer.rowCount.value).toBe(100)
    expect(table.pagination.value.pageIndex).toBe(3)
  })

  it('a stale finally cannot clear loading for a newer in-flight request', async () => {
    const consumer = createServerConsumer({ rows: page('p1'), total: 100 })
    const table = serverTable(consumer, { pageIndex: 1, pageSize: 3 })

    table.setPageIndex(2)
    table.setPageIndex(3)
    expect(table.loading.value).toBe(true)

    // Stale request settles first, through both the success and the finally.
    requestAt(consumer, 0).response.resolve({ rows: page('p2'), total: 100 })
    await flush()
    expect(consumer.loading.value).toBe(true)
    expect(table.loading.value).toBe(true)
    expect(consumer.data.value[0]?.id).toBe('p1-1')

    requestAt(consumer, 1).response.resolve({ rows: page('p3'), total: 100 })
    await flush()
    expect(table.loading.value).toBe(false)
    expect(consumer.data.value[0]?.id).toBe('p3-1')
  })

  it('a stale failure cannot set error or clear loading', async () => {
    const consumer = createServerConsumer({ rows: page('p1'), total: 100 })
    const table = serverTable(consumer, { pageIndex: 1, pageSize: 3 })

    table.setPageIndex(2)
    table.setPageIndex(3)
    requestAt(consumer, 0).response.reject(new Error('page 2 timed out'))
    await flush()
    expect(consumer.error.value).toBeUndefined()
    expect(consumer.loading.value).toBe(true)

    requestAt(consumer, 1).response.resolve({ rows: page('p3'), total: 100 })
    await flush()
    expect(consumer.error.value).toBeUndefined()
    expect(consumer.loading.value).toBe(false)
  })
})

describe('server filter on page 4 (spec acceptance)', () => {
  it('makes a single page-1 fetch and ignores the stale page-4 response', async () => {
    const consumer = createServerConsumer({ rows: page('p3'), total: 100 })
    const table = serverTable(consumer, { pageIndex: 3, pageSize: 3 })

    // Navigate to page 4; its response is still in flight when the user filters.
    table.setPageIndex(4)
    expect(consumer.requests).toHaveLength(1)
    const pageFour = requestAt(consumer, 0)
    expect(pageFour.payload.query.pagination.pageIndex).toBe(4)

    table.setGlobalFilter('acme')
    await nextTick()
    expect(consumer.requests).toHaveLength(2)
    const filtered = requestAt(consumer, 1)
    const expected: DataTableQueryState = {
      sorting: [],
      columnFilters: [],
      globalFilter: 'acme',
      pagination: { pageIndex: 1, pageSize: 3 },
    }
    expect(filtered.payload.trigger).toBe('globalFilter')
    expect(filtered.payload.query).toEqual(expected)
    expect(filtered.payload.requestId).toBeGreaterThan(
      pageFour.payload.requestId,
    )

    filtered.response.resolve({ rows: page('acme', 2), total: 2 })
    await flush()
    // The smaller server total does not trigger a clamp follow-up: the reset
    // already wrote page 1 in the same action.
    expect(consumer.requests).toHaveLength(2)
    expect(table.pagination.value).toEqual({ pageIndex: 1, pageSize: 3 })

    pageFour.response.resolve({ rows: page('p4'), total: 100 })
    await flush()
    expect(table.getRowModel().map((row) => row.rowId)).toEqual([
      'acme-1',
      'acme-2',
    ])
    expect(table.rowCount.value).toBe(2)
    expect(table.loading.value).toBe(false)
    expect(consumer.requests).toHaveLength(2)
  })

  it('a page-local filter on page 4 keeps the page and makes no request', async () => {
    const consumer = createServerConsumer({ rows: page('p4'), total: 100 })
    const table = setupTable({
      data: consumer.data,
      columns,
      getRowId,
      manualPagination: true,
      rowCount: consumer.rowCount,
      defaultPagination: { pageIndex: 4, pageSize: 3 },
      onStateChange: consumer.onStateChange,
    })
    table.setGlobalFilter('no such customer')
    await flush()
    expect(consumer.requests).toHaveLength(0)
    expect(table.pagination.value.pageIndex).toBe(4)
    expect(table.getRowModel()).toHaveLength(0)
  })
})

describe('retry()', () => {
  it('emits one stateChange with the same query and a new requestId', async () => {
    const consumer = createServerConsumer({ rows: page('p1'), total: 100 })
    const table = serverTable(consumer, { pageIndex: 1, pageSize: 3 })

    table.setSorting([{ id: 'customer', desc: true }])
    const failed = requestAt(consumer, 0)
    failed.response.reject(new Error('503'))
    await flush()
    expect(consumer.error.value).toBeInstanceOf(Error)
    expect(consumer.loading.value).toBe(false)

    table.retry()
    await nextTick()
    // Exactly one new request; no duplicate emit from v-model writers.
    expect(consumer.requests).toHaveLength(2)
    const retried = requestAt(consumer, 1)
    expect(retried.payload.query).toEqual(failed.payload.query)
    expect(retried.payload.trigger).toBe(failed.payload.trigger)
    expect(retried.payload.requestId).toBe(failed.payload.requestId + 1)

    // Failed state stays visible until a successful response.
    expect(consumer.error.value).toBeInstanceOf(Error)
    expect(consumer.loading.value).toBe(true)
    retried.response.resolve({ rows: page('sorted'), total: 100 })
    await flush()
    expect(consumer.error.value).toBeUndefined()
    expect(consumer.loading.value).toBe(false)
    expect(consumer.data.value[0]?.id).toBe('sorted-1')
  })

  it('supersedes a still-pending request for the same query', async () => {
    const consumer = createServerConsumer({ rows: page('p1'), total: 100 })
    const table = serverTable(consumer, { pageIndex: 1, pageSize: 3 })

    table.setPageIndex(2)
    table.retry()
    expect(consumer.requests).toHaveLength(2)
    const [original, retried] = [requestAt(consumer, 0), requestAt(consumer, 1)]
    expect(retried.payload.query).toEqual(original.payload.query)

    retried.response.resolve({ rows: page('retry'), total: 100 })
    await flush()
    original.response.resolve({ rows: page('original'), total: 100 })
    await flush()
    expect(consumer.data.value[0]?.id).toBe('retry-1')
    expect(consumer.loading.value).toBe(false)
  })
})

describe('GhostDataTable server loop', () => {
  it('controlled v-models: one page-1 fetch per filter, stale page-4 response and finally ignored', async () => {
    const tableRef = ref<GhostDataTableExposed<Invoice>>()
    const consumer = createServerConsumer({ rows: page('p3'), total: 100 })
    const pagination = ref<DataTablePaginationState>({
      pageIndex: 3,
      pageSize: 3,
    })
    const globalFilter = ref<unknown>('')
    let latest: GhostDataTableSlotProps<Invoice> | undefined

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDataTable<Invoice>,
              {
                ref: tableRef,
                data: consumer.data.value,
                columns,
                getRowId,
                manualFiltering: true,
                manualPagination: true,
                rowCount: consumer.rowCount.value,
                loading: consumer.loading.value,
                pagination: pagination.value,
                'onUpdate:pagination': (next: DataTablePaginationState) => {
                  pagination.value = next
                },
                globalFilter: globalFilter.value,
                'onUpdate:globalFilter': (next: unknown) => {
                  globalFilter.value = next
                },
                onStateChange: consumer.onStateChange,
              },
              {
                default: (slotProps: GhostDataTableSlotProps<Invoice>) => {
                  latest = slotProps
                  return h('table', slotProps.tableRootProps)
                },
              },
            )
        },
      }),
    )

    tableRef.value?.setPageIndex(4)
    await nextTick()
    expect(pagination.value.pageIndex).toBe(4)
    expect(wrapper.get('table').attributes('aria-busy')).toBe('true')

    tableRef.value?.setGlobalFilter('acme')
    await nextTick()
    expect(consumer.requests).toHaveLength(2)
    const filtered = requestAt(consumer, 1)
    expect(filtered.payload.query.pagination).toEqual({
      pageIndex: 1,
      pageSize: 3,
    })
    expect(filtered.payload.query.globalFilter).toBe('acme')
    expect(pagination.value.pageIndex).toBe(1)

    // The stale page-4 request settles first; the spinner stays on.
    requestAt(consumer, 0).response.resolve({ rows: page('p4'), total: 100 })
    await flush()
    expect(wrapper.get('table').attributes('aria-busy')).toBe('true')
    expect(latest?.rows.map((row) => row.rowId)).toEqual(
      page('p3').map((row) => row.id),
    )

    filtered.response.resolve({ rows: page('acme', 2), total: 2 })
    await flush()
    expect(wrapper.get('table').attributes('aria-busy')).toBeUndefined()
    expect(latest?.rows.map((row) => row.rowId)).toEqual(['acme-1', 'acme-2'])
    expect(consumer.requests).toHaveLength(2)
  })
})
