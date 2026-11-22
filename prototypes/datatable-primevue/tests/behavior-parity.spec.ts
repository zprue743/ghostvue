import { expect, test } from '@playwright/test'

test('local select-all uses filtered pre-pagination set', async ({ page }) => {
  await page.goto('/harness/local-full')
  await page.waitForFunction(() => Boolean((window as unknown as { __behaviorHarness?: unknown }).__behaviorHarness))
  const result = await page.evaluate(async () => {
    const api = (window as unknown as { __behaviorHarness: {
      setGlobalFilter: (v: string) => void
      toggleSelectAll: () => void
      getSelectedIds: () => string[]
      getPrePaginationCount: () => number
      clearStateLog: () => void
    } }).__behaviorHarness
    api.clearStateLog()
    api.setGlobalFilter('Customer 1')
    api.toggleSelectAll()
    return {
      prePagination: api.getPrePaginationCount(),
      selected: api.getSelectedIds().length,
    }
  })
  expect(result.prePagination).toBeGreaterThan(0)
  expect(result.selected).toBe(result.prePagination)
})

test('server page-local filter keeps page 4 with zero stateChange', async ({ page }) => {
  await page.goto('/harness/server-page-local-filter')
  await page.waitForFunction(() => Boolean((window as unknown as { __behaviorHarness?: unknown }).__behaviorHarness))
  const result = await page.evaluate(async () => {
    const api = (window as unknown as { __behaviorHarness: {
      setGlobalFilter: (v: string) => void
      getPageIndex: () => number
      getStateChangeCount: () => number
      clearStateLog: () => void
    } }).__behaviorHarness
    api.clearStateLog()
    api.setGlobalFilter('Customer 7')
    return { pageIndex: api.getPageIndex(), stateChanges: api.getStateChangeCount() }
  })
  expect(result.pageIndex).toBe(4)
  expect(result.stateChanges).toBe(0)
})

test('server manual filter resets to page 1 with one stateChange', async ({ page }) => {
  await page.goto('/harness/server-manual-filter')
  await page.waitForFunction(() => Boolean((window as unknown as { __behaviorHarness?: unknown }).__behaviorHarness))
  await page.evaluate(() => {
    const api = (window as unknown as { __behaviorHarness: { clearStateLog: () => void; setGlobalFilter: (v: string) => void } }).__behaviorHarness
    api.clearStateLog()
    api.setGlobalFilter('Customer 7')
  })
  await page.waitForFunction(
    () => (window as unknown as { __behaviorHarness?: { getPageIndex: () => number } }).__behaviorHarness?.getPageIndex() === 1,
  )
  const result = await page.evaluate(() => {
    const api = (window as unknown as { __behaviorHarness: {
      getPageIndex: () => number
      getStateChangeCount: () => number
      getLastStateChange: () => { query: { pagination: { pageIndex: number } } } | null
    } }).__behaviorHarness
    return {
      pageIndex: api.getPageIndex(),
      stateChanges: api.getStateChangeCount(),
      lastPage: api.getLastStateChange()?.query.pagination.pageIndex,
    }
  })
  expect(result.pageIndex).toBe(1)
  expect(result.stateChanges).toBe(1)
  expect(result.lastPage).toBe(1)
})