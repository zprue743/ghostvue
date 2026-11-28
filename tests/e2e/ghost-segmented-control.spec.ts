import AxeBuilder from '@axe-core/playwright'

import { docsTest as test, expect } from '../support/docs'
import {
  expectAlignedSelection,
  expectEqualSegments,
  selectedSegmentGeometry,
} from './segmented-control-geometry'
import { startStaticServer } from './static-server'

const tag = '@component:GhostSegmentedControl'

test.describe('GhostSegmentedControl', { tag }, () => {
  test('basic example switches views with pointer and keyboard', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/basic`,
      )

      const group = page.getByRole('group', { name: 'Content view' })
      await expect(group).toBeVisible()

      const grid = page.getByRole('button', { name: 'Grid' })
      const list = page.getByRole('button', { name: 'List' })

      await expect(list).toHaveAttribute('aria-pressed', 'true')
      await grid.click()
      await expect(grid).toHaveAttribute('aria-pressed', 'true')
      await expect(list).toHaveAttribute('aria-pressed', 'false')

      await grid.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(list).toBeFocused()

      await list.click()
      await expect(list).toHaveAttribute('aria-pressed', 'true')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('themed example keeps indicator visible when selection changes', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )

      const indicator = page.locator(
        '.ghost-segmented-control [data-part="indicator"]',
      )
      await expect(indicator).toHaveAttribute('data-indicator-visible', 'true')

      await page.getByRole('button', { name: 'Day' }).click()
      await expect(indicator).toHaveAttribute('data-indicator-visible', 'true')

      const index = await indicator.evaluate((element) =>
        getComputedStyle(element).getPropertyValue(
          '--ghost-segmented-selected-index',
        ),
      )
      expect(index.trim()).toBe('0')
    } finally {
      await playground.close()
    }
  })

  test('themed example aligns indicator and flips roving focus in RTL @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )

      const control = page.locator('.ghost-segmented-control')
      await control.evaluate((el) => {
        el.setAttribute('dir', 'rtl')
      })

      const day = page.getByRole('button', { name: 'Day' })
      const week = page.getByRole('button', { name: 'Week' })
      const indicator = control.locator('[data-part="indicator"]')

      await day.click()
      await expect(day).toHaveAttribute('aria-pressed', 'true')
      await day.focus()

      // In RTL, ArrowLeft moves to the next segment (Week).
      await page.keyboard.press('ArrowLeft')
      await expect(week).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(day).toBeFocused()

      // Indicator must align with the first segment on the inline-start (right)
      // side in RTL. The indicator slides with a CSS transition after the dir
      // flip, so poll for the settled position instead of sampling mid-slide.
      await expect
        .poll(async () => {
          const dayBox = await day.boundingBox()
          const indicatorBox = await indicator.boundingBox()
          if (!dayBox || !indicatorBox) return Number.POSITIVE_INFINITY
          return Math.abs(indicatorBox.x - dayBox.x)
        })
        .toBeLessThan(6)
    } finally {
      await playground.close()
    }
  })

  test('vertical controls keep equal rows under the indicator (#392)', async ({
    page,
  }) => {
    // Reduced motion snaps the indicator, so measurements read settled boxes.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )
      const control = page.getByRole('group', { name: 'Time range' })
      await expect(control).toBeVisible()
      // Only the themed CSS reads `aria-orientation` for layout, so setting
      // it (with a narrow width and one long label) exercises the vertical
      // sizing rules without a dedicated example.
      await control.evaluate((root) => {
        root.setAttribute('aria-orientation', 'vertical')
        root.style.width = '96px'
        const label = [...root.querySelectorAll('button')]
          .flatMap((button) => [...button.childNodes])
          .find((node) => node.textContent?.trim() === 'Month')
        if (!label) throw new Error('missing Month label')
        label.textContent = 'Month to date'
      })
      await page.evaluate(() => document.fonts.ready.then(() => undefined))

      // Default grid: the wrapping label sets every row's height.
      const long = control.getByRole('button', { name: 'Month to date' })
      await long.click()
      const wrapped = await selectedSegmentGeometry(control)
      expect(wrapped.labelLines.length).toBeGreaterThan(1)
      for (const name of ['Day', 'Week', 'Month to date']) {
        await control.getByRole('button', { name }).click()
        await expectEqualSegments(control, `grid ${name}`)
        expectAlignedSelection(
          await selectedSegmentGeometry(control),
          `grid ${name}`,
        )
      }

      // Flex override: equal rows are retained only while labels share one
      // line height (see the Sizing section of the spec); a column flex root
      // has no definite height to split, so rows follow label heights.
      await control.evaluate((root) => {
        root.style.display = 'flex'
        root.style.removeProperty('width')
        const label = [...root.querySelectorAll('button')]
          .flatMap((button) => [...button.childNodes])
          .find((node) => node.textContent?.trim() === 'Month to date')
        if (!label) throw new Error('missing Month to date label')
        label.textContent = 'Month'
      })
      await expect(control).toHaveCSS('display', 'flex')
      await expect(control).toHaveCSS('flex-direction', 'column')
      for (const name of ['Day', 'Week', 'Month']) {
        await control.getByRole('button', { name }).click()
        await expectEqualSegments(control, `flex ${name}`)
        expectAlignedSelection(
          await selectedSegmentGeometry(control),
          `flex ${name}`,
        )
      }
    } finally {
      await playground.close()
    }
  })

  for (const width of [375, 1440]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`Billing and Kbd docs keep selected labels inside their segments at ${String(width)}px in ${colorScheme} mode (#392)`, async ({
        page,
        docsUrl,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })

        await page.goto(`${docsUrl}/examples`)
        const status = page.getByRole('group', { name: 'Invoice status' })
        const pastDue = status.getByRole('button', { name: 'Past due' })
        await pastDue.click()
        await expect(pastDue).toHaveAttribute('aria-pressed', 'true')
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        expectAlignedSelection(
          await selectedSegmentGeometry(status),
          'Past due',
        )

        await page.goto(`${docsUrl}/components/kbd#command-shortcut-sheet`)
        const platform = page.getByRole('group', { name: 'Keycap platform' })
        await platform.getByRole('button', { name: 'PC' }).click()
        const apple = platform.getByRole('button', { name: 'Apple' })
        await apple.click()
        await expect(apple).toHaveAttribute('aria-pressed', 'true')
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        expectAlignedSelection(await selectedSegmentGeometry(platform), 'Apple')
      })
    }
  }

  test('docs home controls keep the indicator on the selected label (#392)', async ({
    page,
  }) => {
    // Reduced motion removes the indicator slide, so each measurement reads
    // the settled position instead of a mid-transition frame.
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/index.html`)

      // Unequal labels ("Apple" vs "PC") used to split a content-sized track
      // evenly, pushing the long label past its segment and the indicator.
      const platform = page.getByRole('group', { name: 'Keycap platform' })
      await platform.scrollIntoViewIfNeeded()
      for (const name of ['PC', 'Apple']) {
        await platform.getByRole('button', { name }).click()
        expectAlignedSelection(await selectedSegmentGeometry(platform), name)
      }
      // Keyboard focus shows a ring that stays inside the control.
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      const apple = platform.getByRole('button', { name: 'Apple' })
      await expect(apple).toBeFocused()
      await expect(apple).toHaveCSS('outline-style', 'solid')
      expectAlignedSelection(await selectedSegmentGeometry(platform), 'focus')

      // Each flagship swaps fonts and spacing, so measure after every switch.
      const themes = page.getByRole('group', { name: 'Flagship theme' })
      await themes.scrollIntoViewIfNeeded()
      for (const name of ['Vibrant', 'Calm', 'Mono', 'Default']) {
        await themes.getByRole('button', { name }).click()
        await expect(themes.getByRole('button', { name })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expect
          .poll(async () => {
            try {
              expectAlignedSelection(
                await selectedSegmentGeometry(themes),
                name,
              )
              return true
            } catch {
              return false
            }
          })
          .toBe(true)
        expectAlignedSelection(await selectedSegmentGeometry(themes), name)
      }
    } finally {
      await docs.close()
    }
  })
})
