import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

interface CardBox {
  readonly label: string
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
}

/** Sub-pixel rounding from fractional rem gaps must not read as misalignment. */
const TOLERANCE = 0.5

async function readCatalogRows(page: Page): Promise<CardBox[][][]> {
  // Rows are derived from rendered geometry rather than grid indices so the
  // check stays valid at every column count `auto-fill` produces.
  return page.locator('.ghost-component-catalog__cards').evaluateAll((lists) =>
    lists.map((list) => {
      const rows: {
        label: string
        top: number
        left: number
        width: number
        height: number
      }[][] = []
      for (const card of list.querySelectorAll(
        ':scope > li > .ghost-component-catalog__card',
      )) {
        const rect = card.getBoundingClientRect()
        const box = {
          label: card.textContent.trim().slice(0, 40),
          top: rect.top + window.scrollY,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }
        // A card starts a new row when it sits to the left of the previous
        // one (the grid wrapped) or the list is a single column.
        const row = rows.at(-1)
        const previous = row?.at(-1)
        if (row && previous && box.left > previous.left) row.push(box)
        else rows.push([box])
      }
      return rows
    }),
  )
}

async function expectAlignedCatalog(page: Page): Promise<void> {
  const lists = await readCatalogRows(page)
  expect(lists.length).toBeGreaterThan(1)
  const declaredGap = await page
    .locator('.ghost-component-catalog__cards')
    .first()
    .evaluate((list) => Number.parseFloat(getComputedStyle(list).rowGap))
  for (const rows of lists) {
    for (const row of rows) {
      const [first] = row
      if (!first) continue
      for (const card of row) {
        expect(
          Math.abs(card.top - first.top),
          `${card.label} top vs ${first.label}`,
        ).toBeLessThanOrEqual(TOLERANCE)
        expect(
          Math.abs(card.height - first.height),
          `${card.label} height vs ${first.label}`,
        ).toBeLessThanOrEqual(TOLERANCE)
      }
    }
    for (let index = 1; index < rows.length; index += 1) {
      const above = rows[index - 1]?.[0]
      const below = rows[index]?.[0]
      if (above && below) {
        // Stacked cards must be separated by the grid gap alone; any extra
        // item margin makes spacing drift from the declared rhythm.
        expect(
          Math.abs(below.top - (above.top + above.height) - declaredGap),
          `gap above ${below.label}`,
        ).toBeLessThanOrEqual(TOLERANCE)
      }
    }
  }
}

const viewports = [
  { name: 'wide', width: 1280, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
] as const

test.describe('docs component catalog layout', () => {
  for (const viewport of viewports) {
    for (const appearance of ['light', 'dark'] as const) {
      test(`cards in a row align at ${viewport.name} width in ${appearance} mode`, async ({
        page,
      }) => {
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.setViewportSize(viewport)
          await page.addInitScript((value) => {
            localStorage.setItem('vitepress-theme-appearance', value)
          }, appearance)
          await page.goto(`${docs.url}/components/`)
          await expect(page.locator('html')).toHaveClass(
            appearance === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/,
          )
          await expect(
            page.locator('.ghost-component-catalog__card').first(),
          ).toBeVisible()
          await expectAlignedCatalog(page)
        } finally {
          await docs.close()
        }
      })
    }
  }

  test('hover and focus-visible do not move or resize cards', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${docs.url}/components/`)
      const firstList = page.locator('.ghost-component-catalog__cards').first()
      const cards = firstList.locator('.ghost-component-catalog__card')
      await expect(cards.first()).toBeVisible()
      const before = await readCatalogRows(page)

      await cards.first().hover()
      expect(await readCatalogRows(page)).toEqual(before)

      // Keyboard focus is what triggers :focus-visible in Chromium.
      await page.mouse.move(0, 0)
      await cards.first().focus()
      await page.keyboard.press('Tab')
      await expect(cards.nth(1)).toBeFocused()
      expect(
        await cards.nth(1).evaluate((card) => card.matches(':focus-visible')),
      ).toBe(true)
      expect(await readCatalogRows(page)).toEqual(before)
    } finally {
      await docs.close()
    }
  })
})
