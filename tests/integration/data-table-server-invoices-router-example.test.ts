import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ServerInvoicesRouter from '../../examples/data-table/server-invoices-router.vue'
import type { DataTableQueryState } from '../../packages/vue/src/ghost-data-table'

/*
 * Acceptance tests for the spec's "Server state, URL, Back, and Retry"
 * section, driven through the executable example. The URL adapter is an
 * in-memory history and every server response is a deferred promise resolved
 * by hand, so each race test picks the exact completion order.
 */

type Wrapper = ReturnType<typeof mount<typeof ServerInvoicesRouter>>

interface Invoice {
  id: string
  customer: string
  status: 'paid' | 'open' | 'overdue'
  amount: number
}

interface InvoicePage {
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

/** Lets pending promise callbacks (try/catch/finally) and renders run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  await nextTick()
}

interface FakeServer {
  calls: { query: DataTableQueryState; response: Deferred<InvoicePage> }[]
  fetchInvoices: (query: DataTableQueryState) => Promise<InvoicePage>
}

function createServer(): FakeServer {
  const calls: FakeServer['calls'] = []
  return {
    calls,
    fetchInvoices(query) {
      const response = deferred<InvoicePage>()
      calls.push({ query, response })
      return response.promise
    },
  }
}

interface MemoryUrl {
  url: {
    read: () => URLSearchParams
    push: (params: URLSearchParams) => void
    listen: (onChange: () => void) => () => void
  }
  entries: string[]
  readonly search: string
  back: () => void
}

/** Browser-like history: push drops forward entries; back fires listeners. */
function createMemoryUrl(initial: string): MemoryUrl {
  const entries = [initial]
  let index = 0
  const listeners = new Set<() => void>()
  return {
    entries,
    get search() {
      return entries[index] ?? ''
    },
    url: {
      read: () => new URLSearchParams(entries[index]),
      push: (params) => {
        entries.splice(index + 1)
        entries.push(params.toString())
        index += 1
      },
      listen: (onChange) => {
        listeners.add(onChange)
        return () => listeners.delete(onChange)
      },
    },
    back() {
      index -= 1
      for (const listener of listeners) listener()
    },
  }
}

function rows(label: string, count = 5): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${label}-${String(index + 1)}`,
    customer: `${label} customer`,
    status: 'open',
    amount: 100 + index,
  }))
}

function invoiceIds(wrapper: Wrapper): string[] {
  return wrapper
    .findAll('tbody tr')
    .map((row) => row.findAll('td')[0]?.text() ?? '')
}

function status(wrapper: Wrapper): string {
  return wrapper.get('[role="status"]').text()
}

function isBusy(wrapper: Wrapper): boolean {
  return wrapper.get('table').attributes('aria-busy') === 'true'
}

function sortHeader(wrapper: Wrapper, name: string) {
  const button = wrapper.get(`button[aria-label="Sort by ${name}"]`)
  const cell = wrapper
    .findAll('th')
    .find((th) => th.find(`button[aria-label="Sort by ${name}"]`).exists())
  if (!cell) throw new Error(`missing ${name} header`)
  return { button, cell }
}

function mountExample(search: string) {
  const server = createServer()
  const memory = createMemoryUrl(search)
  const wrapper = mount(ServerInvoicesRouter, {
    attachTo: document.body,
    props: { url: memory.url, fetchInvoices: server.fetchInvoices },
  })
  return { wrapper, server, memory }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
})

describe('data-table/server-invoices-router: URL hydration', () => {
  it('applies the URL without a stateChange echo, then fetches once', async () => {
    const { wrapper, server, memory } = mountExample(
      'id=data-table%2Fserver-invoices-router&status=open&sort=-amount&page=2',
    )
    await flush()

    // The only request is the explicit first-entry fetch, for the URL query.
    expect(server.calls).toHaveLength(1)
    expect(server.calls[0]?.query).toEqual({
      sorting: [{ id: 'amount', desc: true }],
      columnFilters: [{ id: 'status', value: 'open' }],
      globalFilter: undefined,
      pagination: { pageIndex: 2, pageSize: 5 },
    })
    // Hydration and its fetch never push history.
    expect(memory.entries).toHaveLength(1)
    expect(sortHeader(wrapper, 'Amount').cell.attributes('aria-sort')).toBe(
      'descending',
    )
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe(
      'open',
    )
    expect(isBusy(wrapper)).toBe(true)
    expect(status(wrapper)).toBe('Loading invoices…')

    server.calls[0]?.response.resolve({ rows: rows('p2'), total: 16 })
    await flush()
    expect(isBusy(wrapper)).toBe(false)
    expect(status(wrapper)).toBe('16 invoices, page 2 of 4')
    expect(invoiceIds(wrapper)[0]).toBe('p2-1')
    expect(
      wrapper.get('button[aria-current="page"]').attributes('aria-label'),
    ).toBe('Page 2')
    expect(server.calls).toHaveLength(1)
    expect(memory.entries).toHaveLength(1)
  })

  it('ignores unknown URL values instead of failing', async () => {
    const { server } = mountExample('sort=-secret&status=void&page=-3')
    await flush()
    expect(server.calls[0]?.query).toMatchObject({
      sorting: [],
      columnFilters: [],
      pagination: { pageIndex: 1, pageSize: 5 },
    })
  })
})

describe('data-table/server-invoices-router: one request per committed query', () => {
  it('pushes one history entry and makes one fetch per sort, keeping foreign params', async () => {
    const { wrapper, server, memory } = mountExample('id=demo&page=3')
    await flush()
    server.calls[0]?.response.resolve({ rows: rows('p3'), total: 47 })
    await flush()

    await sortHeader(wrapper, 'Customer').button.trigger('click')
    await flush()
    expect(server.calls).toHaveLength(2)
    expect(server.calls[1]?.query.sorting).toEqual([
      { id: 'customer', desc: false },
    ])
    // Sorting never resets the page.
    expect(server.calls[1]?.query.pagination.pageIndex).toBe(3)
    expect(memory.entries).toEqual([
      'id=demo&page=3',
      'id=demo&sort=customer&page=3',
    ])
  })

  it('server filter on page 4 makes one page-1 fetch and drops the stale page-4 response', async () => {
    const { wrapper, server, memory } = mountExample('page=3')
    await flush()
    server.calls[0]?.response.resolve({ rows: rows('p3'), total: 47 })
    await flush()

    await wrapper.get('button[aria-label="Page 4"]').trigger('click')
    await flush()
    expect(server.calls).toHaveLength(2)
    expect(memory.search).toBe('page=4')

    await wrapper.get('select').setValue('paid')
    await flush()
    expect(server.calls).toHaveLength(3)
    expect(server.calls[2]?.query).toMatchObject({
      columnFilters: [{ id: 'status', value: 'paid' }],
      pagination: { pageIndex: 1, pageSize: 5 },
    })
    expect(memory.search).toBe('status=paid')

    server.calls[2]?.response.resolve({ rows: rows('paid'), total: 16 })
    await flush()
    server.calls[1]?.response.resolve({ rows: rows('p4'), total: 47 })
    await flush()
    expect(invoiceIds(wrapper)[0]).toBe('paid-1')
    expect(status(wrapper)).toBe('16 invoices, page 1 of 4')
    expect(server.calls).toHaveLength(3)
  })
})

describe('data-table/server-invoices-router: Back while pending', () => {
  async function sortThenBack() {
    const mounted = mountExample('status=open')
    const { wrapper, server, memory } = mounted
    await flush()
    server.calls[0]?.response.resolve({ rows: rows('open'), total: 16 })
    await flush()

    await sortHeader(wrapper, 'Amount').button.trigger('click')
    await flush()
    expect(memory.search).toBe('sort=amount&status=open')
    expect(server.calls).toHaveLength(2)
    expect(isBusy(wrapper)).toBe(true)

    // Back lands while the sort request is still pending.
    memory.back()
    await flush()
    return mounted
  }

  it('restores the previous query and fetches it once, without new history', async () => {
    const { wrapper, server, memory } = await sortThenBack()
    expect(memory.search).toBe('status=open')
    expect(memory.entries).toHaveLength(2)
    expect(server.calls).toHaveLength(3)
    expect(server.calls[2]?.query).toMatchObject({
      sorting: [],
      columnFilters: [{ id: 'status', value: 'open' }],
      pagination: { pageIndex: 1, pageSize: 5 },
    })
    expect(sortHeader(wrapper, 'Amount').cell.attributes('aria-sort')).toBe(
      undefined,
    )
  })

  it('a stale sort response that resolves first neither applies nor clears loading', async () => {
    const { wrapper, server } = await sortThenBack()

    server.calls[1]?.response.resolve({ rows: rows('sorted'), total: 16 })
    await flush()
    expect(invoiceIds(wrapper)[0]).toBe('open-1')
    expect(isBusy(wrapper)).toBe(true)
    expect(status(wrapper)).toBe('Loading invoices…')

    server.calls[2]?.response.resolve({ rows: rows('restored'), total: 16 })
    await flush()
    expect(invoiceIds(wrapper)[0]).toBe('restored-1')
    expect(isBusy(wrapper)).toBe(false)
  })

  it('a stale sort response that resolves last does not overwrite the restored rows', async () => {
    const { wrapper, server } = await sortThenBack()

    server.calls[2]?.response.resolve({ rows: rows('restored'), total: 16 })
    await flush()
    expect(invoiceIds(wrapper)[0]).toBe('restored-1')

    server.calls[1]?.response.reject(new Error('late failure'))
    await flush()
    server.calls[1]?.response.resolve({ rows: rows('sorted'), total: 16 })
    await flush()
    expect(invoiceIds(wrapper)[0]).toBe('restored-1')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(isBusy(wrapper)).toBe(false)
    expect(status(wrapper)).toBe('16 invoices, page 1 of 4')
  })

  it('restores a page beyond the current total instead of clamping it to page 1', async () => {
    const { wrapper, server, memory } = mountExample('page=7')
    await flush()
    server.calls[0]?.response.resolve({ rows: rows('p7'), total: 47 })
    await flush()

    await wrapper.get('select').setValue('paid')
    await flush()
    server.calls[1]?.response.resolve({ rows: rows('paid'), total: 16 })
    await flush()
    expect(memory.search).toBe('status=paid')

    memory.back()
    await flush()
    expect(server.calls).toHaveLength(3)
    expect(server.calls[2]?.query.pagination.pageIndex).toBe(7)
    expect(server.calls[2]?.query.columnFilters).toEqual([])
  })
})

describe('data-table/server-invoices-router: Retry', () => {
  it('keeps the error visible until a retry succeeds, with one fetch and no history', async () => {
    const { wrapper, server, memory } = mountExample('sort=customer')
    await flush()
    server.calls[0]?.response.reject(new Error('Service unavailable'))
    await flush()

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Service unavailable')
    expect(isBusy(wrapper)).toBe(false)

    await wrapper.get('[role="alert"] button').trigger('click')
    await flush()
    expect(server.calls).toHaveLength(2)
    expect(server.calls[1]?.query).toEqual(server.calls[0]?.query)
    expect(memory.entries).toEqual(['sort=customer'])
    // Failed state stays until a successful response.
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(isBusy(wrapper)).toBe(true)

    server.calls[1]?.response.resolve({ rows: rows('ok'), total: 3 })
    await flush()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(invoiceIds(wrapper)[0]).toBe('ok-1')
    expect(server.calls).toHaveLength(2)
  })

  it('a retry supersedes the still-pending request it repeats', async () => {
    const { wrapper, server } = mountExample('')
    await flush()
    server.calls[0]?.response.reject(new Error('Timeout'))
    await flush()
    await wrapper.get('[role="alert"] button').trigger('click')
    await flush()
    await wrapper.get('[role="alert"] button').trigger('click')
    await flush()
    expect(server.calls).toHaveLength(3)

    server.calls[2]?.response.resolve({ rows: rows('third'), total: 5 })
    await flush()
    server.calls[1]?.response.reject(new Error('Old failure'))
    await flush()
    expect(invoiceIds(wrapper)[0]).toBe('third-1')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('data-table/server-invoices-router: default adapters', () => {
  it('syncs window.location and follows a real popstate', async () => {
    window.history.replaceState(null, '', '/examples.html?id=demo&status=paid')
    const server = createServer()
    const wrapper = mount(ServerInvoicesRouter, {
      attachTo: document.body,
      props: { fetchInvoices: server.fetchInvoices },
    })
    await flush()
    expect(server.calls[0]?.query.columnFilters).toEqual([
      { id: 'status', value: 'paid' },
    ])
    server.calls[0]?.response.resolve({ rows: rows('paid'), total: 16 })
    await flush()

    await sortHeader(wrapper, 'Invoice').button.trigger('click')
    await flush()
    expect(window.location.search).toBe('?id=demo&sort=id&status=paid')

    const popped = new Promise<void>((resolve) => {
      window.addEventListener(
        'popstate',
        () => {
          resolve()
        },
        { once: true },
      )
    })
    window.history.back()
    await popped
    await flush()
    expect(window.location.search).toBe('?id=demo&status=paid')
    expect(server.calls).toHaveLength(3)
    expect(server.calls[2]?.query.sorting).toEqual([])

    wrapper.unmount()
  })

  it('demo service answers after its latency and can fail once for Retry', async () => {
    vi.useFakeTimers()
    const memory = createMemoryUrl('')
    const wrapper = mount(ServerInvoicesRouter, {
      attachTo: document.body,
      props: { url: memory.url },
    })
    await flush()
    expect(status(wrapper)).toBe('Loading invoices…')
    await vi.advanceTimersByTimeAsync(600)
    await flush()
    expect(status(wrapper)).toBe('47 invoices, page 1 of 10')
    expect(invoiceIds(wrapper)).toEqual([
      'INV-1001',
      'INV-1002',
      'INV-1003',
      'INV-1004',
      'INV-1005',
    ])

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await sortHeader(wrapper, 'Amount').button.trigger('click')
    await sortHeader(wrapper, 'Amount').button.trigger('click')
    await vi.advanceTimersByTimeAsync(600)
    await flush()
    // The failing request was superseded by the second click; it never shows.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(memory.search).toBe('sort=-amount')

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('select').setValue('overdue')
    await vi.advanceTimersByTimeAsync(600)
    await flush()
    expect(wrapper.get('[role="alert"]').text()).toContain('503')

    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.advanceTimersByTimeAsync(600)
    await flush()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(status(wrapper)).toBe('15 invoices, page 1 of 3')
    const amounts = wrapper
      .findAll('tbody tr')
      .map((row) => Number.parseFloat(row.findAll('td')[3]?.text() ?? ''))
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
  })
})
