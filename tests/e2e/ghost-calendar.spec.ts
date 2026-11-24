import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostCalendar'

async function openExample(page: Page, id: string) {
  const playground = await startStaticServer('apps/playground/dist')
  await page.goto(`${playground.url}/examples.html?id=${id}`)
  const grid = page.getByRole('grid')
  await expect(grid).toBeVisible()
  return {
    playground,
    grid,
    day: (iso: string) =>
      page.locator(`[data-ghost-calendar-date="${iso}"]`).first(),
    heading: () => page.getByRole('heading', { level: 2 }),
  }
}

async function tabToGrid(page: Page) {
  await page.getByRole('button', { name: /previous month/i }).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
}

test.describe('GhostCalendar', { tag }, () => {
  test('Home and End use week boundaries', async ({ page }) => {
    const { playground, day } = await openExample(page, 'calendar/basic')
    try {
      await day('2024-06-15').click()
      await page.keyboard.press('Home')
      await expect(day('2024-06-09')).toBeFocused()
      await page.keyboard.press('End')
      await expect(day('2024-06-15')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('keyboard grid navigation uses real DOM focus @cross-browser', async ({
    page,
  }) => {
    const { playground, day, heading } = await openExample(
      page,
      'calendar/basic',
    )

    try {
      await day('2024-06-30').click()
      await day('2024-06-30').focus()
      await expect(day('2024-06-30')).toBeFocused()

      await page.keyboard.press('ArrowRight')
      await expect(day('2024-07-01')).toBeFocused()
      await expect(heading()).toContainText('July')

      await page.keyboard.press('ArrowLeft')
      await expect(day('2024-06-30')).toBeFocused()
      await expect(heading()).toContainText('June')

      await page.keyboard.press('ArrowUp')
      await expect(day('2024-06-23')).toBeFocused()

      await page.keyboard.press('ArrowDown')
      await expect(day('2024-06-30')).toBeFocused()

      await day('2024-06-15').click()
      await page.keyboard.press('PageDown')
      await expect(day('2024-07-15')).toBeFocused()
      await expect(heading()).toContainText('July')

      await page.keyboard.press('PageUp')
      await expect(day('2024-06-15')).toBeFocused()

      await page.keyboard.press('Shift+PageDown')
      await expect(day('2025-06-15')).toBeFocused()
      await expect(heading()).toContainText('2025')

      await page.keyboard.press('Shift+PageUp')
      await expect(day('2024-06-15')).toBeFocused()

      await day('2024-06-16').click()
      await page.keyboard.press('Enter')
      await expect(day('2024-06-16')).toHaveAttribute('aria-selected', 'true')

      await day('2024-06-17').focus()
      await page.keyboard.press('Space')
      await expect(day('2024-06-17')).toHaveAttribute('aria-selected', 'true')
    } finally {
      await playground.close()
    }
  })

  test('clamps month-sized moves and min/max focus bounds', async ({
    page,
  }) => {
    const { playground, day, heading } = await openExample(
      page,
      'calendar/controlled',
    )

    try {
      await day('2024-01-31').focus()
      await expect(day('2024-01-31')).toBeFocused()

      await page.keyboard.press('PageDown')
      await expect(day('2024-02-29')).toBeFocused()
      await expect(heading()).toContainText('February')

      await day('2024-02-15').click()
      await page.keyboard.press('PageUp')
      await expect(day('2024-01-15')).toBeFocused()
      await expect(heading()).toContainText('January')

      await day('2024-01-01').click()
      await page.keyboard.press('ArrowLeft')
      await expect(day('2024-01-01')).toBeFocused()

      await page.keyboard.press('ArrowRight')
      await expect(day('2024-01-02')).toBeFocused()

      const nextMonth = page.getByRole('button', { name: /next month/i })
      for (let index = 0; index < 11; index += 1) {
        await nextMonth.click()
      }
      await day('2024-12-31').click()
      await day('2024-12-31').press('ArrowRight')
      await expect(day('2024-12-31')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('unavailable dates stay focusable and block selection', async ({
    page,
  }) => {
    const { playground, day } = await openExample(page, 'calendar/controlled')

    try {
      await day('2024-01-11').focus()
      await page.keyboard.press('ArrowRight')
      await expect(day('2024-01-12')).toBeFocused()
      await expect(day('2024-01-12')).toHaveAttribute('aria-disabled', 'true')

      await page.keyboard.press('Enter')
      await expect(day('2024-01-12')).toHaveAttribute('aria-selected', 'false')
      await expect(day('2024-01-31')).toHaveAttribute('aria-selected', 'true')

      await day('2024-01-05').focus()
      await page.keyboard.press('ArrowDown')
      await expect(day('2024-01-12')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('range selection works from the keyboard', async ({ page }) => {
    const { playground, day } = await openExample(page, 'calendar/range')

    try {
      await day('2024-06-16').click()
      await day('2024-06-16').focus()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await expect(day('2024-06-18')).toBeFocused()
      await page.keyboard.press('Space')
      await expect(day('2024-06-18')).toHaveAttribute('aria-selected', 'true')
      await expect(day('2024-06-17')).toHaveAttribute(
        'data-state',
        'range-middle',
      )
    } finally {
      await playground.close()
    }
  })

  test('RTL mirrors horizontal arrows @cross-browser', async ({ page }) => {
    const { playground, day } = await openExample(page, 'calendar/basic')

    try {
      await page.getByTestId('ghost-example-preview').evaluate((node) => {
        node.setAttribute('dir', 'rtl')
      })

      await day('2024-06-15').focus()
      await page.keyboard.press('ArrowRight')
      await expect(day('2024-06-14')).toBeFocused()

      await page.keyboard.press('ArrowLeft')
      await expect(day('2024-06-15')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('tab into grid focuses selected or today', async ({ page }) => {
    const basicPlayground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${basicPlayground.url}/examples.html?id=calendar/basic`)
      await tabToGrid(page)
      await expect(
        page.locator('[data-ghost-calendar-date="2024-06-15"]'),
      ).toBeFocused()
    } finally {
      await basicPlayground.close()
    }

    const unselectedPlayground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${unselectedPlayground.url}/examples.html?id=calendar/unselected`,
      )
      await tabToGrid(page)
      await expect(
        page.locator('[data-ghost-calendar-date="2024-06-10"]'),
      ).toBeFocused()
    } finally {
      await unselectedPlayground.close()
    }
  })

  test('axe passes with a selected date', async ({ page }) => {
    const { playground, day } = await openExample(page, 'calendar/basic')

    try {
      await day('2024-06-18').click()
      await expect(day('2024-06-18')).toHaveAttribute('aria-selected', 'true')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  for (const width of [390, 1280]) {
    test(`themed grid is 7 aligned columns at ${String(width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      const { playground, grid, day } = await openExample(
        page,
        'calendar/themed',
      )
      try {
        const layout = await grid.evaluate((element) => {
          const box = (node: Element) => node.getBoundingClientRect()
          const rows = [...element.querySelectorAll('[role="row"]')]
          return rows.map((row) =>
            [...row.children].map((cell) => {
              const rect = box(cell)
              return {
                center: Math.round(rect.left + rect.width / 2),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                text: cell.textContent.trim(),
              }
            }),
          )
        })
        const [header, ...weeks] = layout
        expect(header?.map((cell) => cell.text)).toEqual([
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
        ])
        // June 1, 2024 is a Saturday; June 30 starts the sixth week.
        expect(weeks).toHaveLength(6)
        expect(weeks[0]?.map((cell) => cell.text)).toEqual([
          '26',
          '27',
          '28',
          '29',
          '30',
          '31',
          '1',
        ])
        const widths = new Set(weeks.flat().map((cell) => cell.width))
        expect(widths.size).toBe(1)
        for (const week of weeks) {
          expect(week).toHaveLength(7)
          // One visual line per week: no wrapping.
          expect(new Set(week.map((cell) => cell.top)).size).toBe(1)
          week.forEach((cell, column) => {
            const label = header?.[column]
            expect(Math.abs(cell.center - (label?.center ?? 0))).toBeLessThan(2)
          })
        }

        await expect(day('2024-05-26')).toHaveAttribute(
          'data-outside-month',
          '',
        )
        await expect(day('2024-06-18')).toHaveAttribute('aria-current', 'date')
        await expect(
          page.getByRole('button', { name: 'Previous month' }),
        ).toBeVisible()
        await expect(
          page.getByRole('button', { name: 'Next month' }),
        ).toBeVisible()
        await page.getByRole('button', { name: 'Next month' }).click()
        await expect(page.getByRole('heading', { level: 2 })).toContainText(
          'July 2024',
        )

        const results = await new AxeBuilder({ page }).analyze()
        expect(results.violations).toEqual([])
      } finally {
        await playground.close()
      }
    })
  }

  test('Monday-first locales start the grid on Monday', async ({ page }) => {
    const { playground, grid } = await openExample(page, 'calendar/locale')
    try {
      const firstWeek = grid
        .getByRole('row')
        .nth(1)
        .locator('[data-ghost-calendar-date]')
      await expect(firstWeek.first()).toHaveAttribute(
        'data-ghost-calendar-date',
        '2024-05-27',
      )
      await expect(firstWeek.nth(5)).toHaveAttribute(
        'data-ghost-calendar-date',
        '2024-06-01',
      )
    } finally {
      await playground.close()
    }
  })
})
