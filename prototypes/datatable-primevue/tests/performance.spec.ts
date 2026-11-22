import { expect, test } from '@playwright/test'

async function measureOnPage(
  page: import('@playwright/test').Page,
  sortSelector: string,
) {
  const sortMs = await page.evaluate(async (selector) => {
    performance.mark('sort-start')
    const el = document.querySelector(selector)
    ;(el as HTMLElement | null)?.click()
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    performance.mark('sort-end')
    performance.measure('sort', 'sort-start', 'sort-end')
    return performance.getEntriesByName('sort').at(-1)?.duration ?? -1
  }, sortSelector)

  const filterMs = await page.evaluate(async () => {
    performance.mark('filter-start')
    const input = document.querySelector(
      '[data-testid="global-filter"]',
    ) as HTMLInputElement | null
    if (input) {
      input.value = 'ACME'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    performance.mark('filter-end')
    performance.measure('filter', 'filter-start', 'filter-end')
    return performance.getEntriesByName('filter').at(-1)?.duration ?? -1
  })

  return { sortMs, filterMs }
}

for (const rows of [1000, 10000]) {
  test(`Ghost perf ${rows} rows`, async ({ page }) => {
    await page.goto(`/perf/ghost?rows=${rows}`)
    await page.waitForSelector('[data-testid="sort-amount"]')
    const result = await measureOnPage(page, '[data-testid="sort-amount"]')
    expect(result.sortMs).toBeGreaterThan(0)
    expect(result.filterMs).toBeGreaterThan(0)
    await test.info().attach(`ghost-${rows}`, {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
  })

  test(`Prime perf ${rows} rows`, async ({ page }) => {
    await page.goto(`/perf/prime?rows=${rows}`)
    await page.getByRole('columnheader', { name: 'Amount' }).waitFor()
    const primeSortSelector = await page.evaluate(() => {
      const headers = [...document.querySelectorAll('th')]
      const amount = headers.find((th) => th.textContent?.includes('Amount'))
      if (!amount) return 'th'
      amount.setAttribute('data-perf-sort-amount', '')
      return '[data-perf-sort-amount]'
    })
    const result = await measureOnPage(page, primeSortSelector)
    expect(result.sortMs).toBeGreaterThan(0)
    expect(result.filterMs).toBeGreaterThan(0)
    await test.info().attach(`prime-${rows}`, {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
  })
}