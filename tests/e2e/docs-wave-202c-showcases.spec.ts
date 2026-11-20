import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * Real-docs verification for Wave 202c showcases (GHO-215):
 * - context-menu, menubar, drawer, hover-card, tooltip, calendar, pagination,
 *   tree, and date-picker
 * Covers leading showcase order, axe-core closed & open in light/dark mode,
 * body-portaled overlay token & light/dark appearance inheritance, 390px/1280px
 * layout with no horizontal overflow, and keyboard/interactive behavior.
 */

const modes = ['light', 'dark'] as const
type Mode = (typeof modes)[number]

const redesignedHeroes = [
  { slug: 'context-menu', id: 'context-menu/themed' },
  { slug: 'menubar', id: 'menubar/themed' },
  { slug: 'drawer', id: 'drawer/themed' },
  { slug: 'hover-card', id: 'hover-card/themed' },
  { slug: 'tooltip', id: 'tooltip/themed' },
  { slug: 'calendar', id: 'calendar/themed' },
  { slug: 'pagination', id: 'pagination/themed' },
  { slug: 'tree', id: 'tree/themed' },
] as const

async function openDocsExample(
  page: Page,
  url: string,
  slug: string,
  id: string,
  mode: Mode,
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/${slug}.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

async function readPortaledColors(
  locator: Locator,
): Promise<{ bg: string; color: string; inBody: boolean }> {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      inBody:
        el.closest('.ghost-example') === null && document.body.contains(el),
    }
  })
}

test.describe('docs Wave 202c showcases (GHO-215)', () => {
  test('all 8 redesigned showcases lead their pages, pass axe, and fit 390px and 1280px', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const { slug, id } of redesignedHeroes) {
        for (const width of [390, 1280] as const) {
          await page.setViewportSize({ width, height: 900 })
          const frame = await openDocsExample(page, docs.url, slug, id, 'light')
          await expect(
            page.locator('.vp-doc [data-example-id]').first(),
          ).toHaveAttribute('data-example-id', id)
          await expect(frame).toHaveAttribute('data-example-layer', 'themed')
          await expectNoPageOverflow(page)
        }

        for (const mode of modes) {
          await openDocsExample(page, docs.url, slug, id, mode)
          const results = await new AxeBuilder({ page })
            .include(`[data-example-id="${id}"]`)
            .analyze()
          expect(results.violations, `${slug} (${mode})`).toEqual([])
        }
      }
    } finally {
      await docs.close()
    }
  })

  test('body-portaled overlays inherit theme tokens and switch cleanly between light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      // 1. ContextMenu
      const cmStyles: Record<
        Mode,
        { bg: string; color: string; inBody: boolean }
      > = {} as never
      for (const mode of modes) {
        const frame = await openDocsExample(
          page,
          docs.url,
          'context-menu',
          'context-menu/themed',
          mode,
        )
        const trigger = frame
          .getByTestId('ghost-example-preview')
          .getByTestId('context-themed-trigger')
          .first()
        const content = page.getByTestId('context-themed-content')
        await expect(async () => {
          if (!(await content.isVisible())) {
            await trigger.click({ button: 'right' })
            await expect(content).toBeVisible({ timeout: 500 })
          }
        }).toPass()
        cmStyles[mode] = await readPortaledColors(content)
        expect(cmStyles[mode].inBody).toBe(true)
        const axe = await new AxeBuilder({ page })
          .include('[data-testid="context-themed-content"]')
          .analyze()
        expect(axe.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
      expect(cmStyles.light.bg).not.toBe(cmStyles.dark.bg)

      // 2. Menubar
      const mbStyles: Record<
        Mode,
        { bg: string; color: string; inBody: boolean }
      > = {} as never
      for (const mode of modes) {
        const frame = await openDocsExample(
          page,
          docs.url,
          'menubar',
          'menubar/themed',
          mode,
        )
        const trigger = frame
          .getByTestId('ghost-example-preview')
          .getByRole('menuitem', { name: 'File' })
        const menu = page.getByRole('menu')
        await expect(async () => {
          if (!(await menu.isVisible())) {
            await trigger.click()
            await expect(menu).toBeVisible({ timeout: 500 })
          }
        }).toPass()
        mbStyles[mode] = await readPortaledColors(menu)
        expect(mbStyles[mode].inBody).toBe(true)
        const axe = await new AxeBuilder({ page })
          .include('[role="menu"]')
          .analyze()
        expect(axe.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
      expect(mbStyles.light.bg).not.toBe(mbStyles.dark.bg)

      // 3. Drawer
      const drStyles: Record<
        Mode,
        { bg: string; color: string; inBody: boolean }
      > = {} as never
      for (const mode of modes) {
        const frame = await openDocsExample(
          page,
          docs.url,
          'drawer',
          'drawer/themed',
          mode,
        )
        const trigger = frame
          .getByTestId('ghost-example-preview')
          .getByRole('button', { name: 'Inspect order' })
        const dialog = page.getByRole('dialog', { name: 'Order #4182' })
        await expect(async () => {
          if (!(await dialog.isVisible())) {
            await trigger.click()
            await expect(dialog).toBeVisible({ timeout: 500 })
          }
        }).toPass()
        drStyles[mode] = await readPortaledColors(dialog)
        expect(drStyles[mode].inBody).toBe(true)
        const axe = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .analyze()
        expect(axe.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
      expect(drStyles.light.bg).not.toBe(drStyles.dark.bg)

      // 4. HoverCard
      const hcStyles: Record<
        Mode,
        { bg: string; color: string; inBody: boolean }
      > = {} as never
      for (const mode of modes) {
        const frame = await openDocsExample(
          page,
          docs.url,
          'hover-card',
          'hover-card/themed',
          mode,
        )
        const trigger = frame
          .getByTestId('ghost-example-preview')
          .getByRole('button', { name: '@ghostvue/themes' })
        const card = page.getByRole('dialog')
        await expect(async () => {
          if (!(await card.isVisible())) {
            await trigger.focus()
            await expect(card).toBeVisible({ timeout: 500 })
          }
        }).toPass()
        hcStyles[mode] = await readPortaledColors(card)
        expect(hcStyles[mode].inBody).toBe(true)
        const axe = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .analyze()
        expect(axe.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
      expect(hcStyles.light.bg).not.toBe(hcStyles.dark.bg)

      // 5. Tooltip
      const ttStyles: Record<
        Mode,
        { bg: string; color: string; inBody: boolean }
      > = {} as never
      for (const mode of modes) {
        const frame = await openDocsExample(
          page,
          docs.url,
          'tooltip',
          'tooltip/themed',
          mode,
        )
        const trigger = frame
          .getByTestId('ghost-example-preview')
          .getByRole('button', { name: 'Explain Latency p95' })
        const tip = page.getByRole('tooltip')
        await expect(async () => {
          if (!(await tip.isVisible())) {
            await trigger.focus()
            await expect(tip).toBeVisible({ timeout: 500 })
          }
        }).toPass()
        ttStyles[mode] = await readPortaledColors(tip)
        expect(ttStyles[mode].inBody).toBe(true)
        const axe = await new AxeBuilder({ page })
          .include('[role="tooltip"]')
          .analyze()
        expect(axe.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
      expect(ttStyles.light.bg).not.toBe(ttStyles.dark.bg)

      // 6. DatePicker
      const dpStyles: Record<
        Mode,
        { bg: string; color: string; inBody: boolean }
      > = {} as never
      for (const mode of modes) {
        const frame = await openDocsExample(
          page,
          docs.url,
          'date-picker',
          'date-picker/themed',
          mode,
        )
        const trigger = frame
          .getByTestId('ghost-example-preview')
          .getByRole('button')
        const dialog = page.getByRole('dialog')
        await expect(async () => {
          if (!(await dialog.isVisible())) {
            await trigger.click()
            await expect(dialog).toBeVisible({ timeout: 500 })
          }
        }).toPass()
        dpStyles[mode] = await readPortaledColors(dialog)
        expect(dpStyles[mode].inBody).toBe(true)
        const axe = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .analyze()
        expect(axe.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
      expect(dpStyles.light.bg).not.toBe(dpStyles.dark.bg)
    } finally {
      await docs.close()
    }
  })

  test('calendar, pagination, and tree themed showcases update state cleanly', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      // Calendar
      const calFrame = await openDocsExample(
        page,
        docs.url,
        'calendar',
        'calendar/themed',
        'light',
      )
      const calPreview = calFrame.getByTestId('ghost-example-preview')
      await expect(calPreview.getByRole('status')).toContainText('2024-06-18')
      await calPreview.getByRole('gridcell', { name: /June 20, 2024/ }).click()
      await expect(calPreview.getByRole('status')).toContainText('2024-06-20')

      // Pagination
      const pagFrame = await openDocsExample(
        page,
        docs.url,
        'pagination',
        'pagination/themed',
        'light',
      )
      const pagPreview = pagFrame.getByTestId('ghost-example-preview')
      await expect(pagPreview.getByRole('status')).toContainText(
        'Showing 21–30 of 80 invoices',
      )
      await pagPreview
        .getByRole('button', { name: 'Page 4', exact: true })
        .click()
      await expect(pagPreview.getByRole('status')).toContainText(
        'Showing 31–40 of 80 invoices',
      )

      // Tree
      const treeFrame = await openDocsExample(
        page,
        docs.url,
        'tree',
        'tree/themed',
        'light',
      )
      const treePreview = treeFrame.getByTestId('ghost-example-preview')
      await expect(treePreview.getByRole('status')).toContainText(
        'Selected: components/tree',
      )
      await treePreview.getByRole('treeitem', { name: 'Tokens' }).click()
      await expect(treePreview.getByRole('status')).toContainText(
        'Selected: tokens',
      )
    } finally {
      await docs.close()
    }
  })
})
