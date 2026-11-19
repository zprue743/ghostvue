import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Table page leads with the `table/team-directory` showcase. These checks
 * cover what a screenshot cannot prove: the named scroll region pans on a
 * phone without widening the page, its focus ring is the token ring and is
 * not clipped, row actions and search change state with real focus, hover
 * and focus never move the row actions, and docs prose styles stay out.
 */
const id = 'table/team-directory'
const modes = ['light', 'dark'] as const

async function openTablePage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/table.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame.getByTestId('ghost-example-preview')
}

test.describe('docs Table team directory showcase', () => {
  test('leads the page and passes axe in light and dark', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        await openTablePage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        const axe = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(axe.violations).toEqual([])
      }
      // The demo heading has no id, so it never joins the page outline.
      await expect(
        page.locator('.VPDocAsideOutline').getByText('Team directory'),
      ).toHaveCount(0)
    } finally {
      await docs.close()
    }
  })

  test('the named region scrolls on a phone and shows the token focus ring', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 375, height: 900 })
      const preview = await openTablePage(page, docs.url)
      const region = preview.getByRole('region', { name: 'Team members' })
      await expect(region).toBeVisible()

      const overflow = await region.evaluate(
        (el) => el.scrollWidth - el.clientWidth,
      )
      expect(overflow).toBeGreaterThan(0)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(0)

      // Keyboard focus reaches the region right after Refresh.
      await preview.getByRole('button', { name: 'Refresh' }).focus()
      await page.keyboard.press('Tab')
      await expect(region).toBeFocused()
      const ring = await region.evaluate((el) => {
        const style = getComputedStyle(el)
        return {
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
          offset: Number.parseFloat(style.outlineOffset),
        }
      })
      expect(ring.style).toBe('solid')
      expect(ring.width).toBeGreaterThan(0)
      // Inset ring: drawn inside the region, so nothing around it clips it.
      expect(ring.offset).toBe(-ring.width)

      await page.keyboard.press('ArrowRight')
      await expect
        .poll(() => region.evaluate((el) => el.scrollLeft))
        .toBeGreaterThan(0)
    } finally {
      await docs.close()
    }
  })

  test('row actions open with the keyboard and update status without moving the row', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const preview = await openTablePage(page, docs.url)
      const trigger = preview.getByRole('button', {
        name: 'Actions for Grace Hopper',
      })
      const row = preview.getByRole('row', { name: /Grace Hopper/ })
      const measure = () =>
        trigger.evaluate((el: HTMLElement) => {
          const box = el.getBoundingClientRect()
          return [box.width, box.height, el.offsetTop, el.offsetLeft]
        })
      const idle = await measure()
      await trigger.hover()
      await trigger.focus()
      expect(await measure()).toEqual(idle)

      // Retry until hydration has attached the menu trigger.
      await expect(async () => {
        await trigger.press('Enter')
        await expect(page.getByRole('menu')).toBeVisible({ timeout: 500 })
      }).toPass()
      const suspend = page.getByRole('menuitem', { name: 'Suspend access' })
      await expect(
        page.getByRole('menuitem', { name: 'Resend invite' }),
      ).toBeDisabled()
      await suspend.focus()
      await expect(suspend).toBeFocused()
      await page.keyboard.press('Enter')

      await expect(page.getByRole('menu')).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(row.getByText('Suspended')).toBeVisible()
      await expect(preview.getByRole('status')).toHaveText(
        'Grace Hopper can no longer sign in.',
      )
    } finally {
      await docs.close()
    }
  })

  test('search shows the empty state, and Clear search restores rows and focus', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const preview = await openTablePage(page, docs.url)
      const search = preview.getByRole('searchbox', { name: 'Search members' })
      await expect(async () => {
        await search.fill('zzz')
        await expect(preview.getByText('No members match “zzz”')).toBeVisible({
          timeout: 500,
        })
      }).toPass()
      await expect(preview.getByRole('status')).toHaveText(
        'Showing 0 of 5 members',
      )
      await preview.getByRole('button', { name: 'Clear search' }).click()
      await expect(search).toBeFocused()
      await expect(search).toHaveValue('')
      await expect(preview.locator('tbody th[scope="row"]')).toHaveCount(5)
    } finally {
      await docs.close()
    }
  })

  test('refresh marks the table busy and keeps rows the same height', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const preview = await openTablePage(page, docs.url)
      const table = preview.getByRole('table', { name: 'Team members' })
      const firstRow = preview.locator('tbody tr').first()
      const loadedHeight = (await firstRow.boundingBox())?.height ?? 0

      const refresh = preview.getByRole('button', { name: 'Refresh' })
      await expect(async () => {
        await refresh.click()
        await expect(table).toHaveAttribute('aria-busy', 'true', {
          timeout: 300,
        })
      }).toPass()
      const loadingHeight = (await firstRow.boundingBox())?.height ?? 0
      expect(Math.abs(loadingHeight - loadedHeight)).toBeLessThanOrEqual(1)

      await expect(table).not.toHaveAttribute('aria-busy', 'true')
      await expect(preview.getByRole('status')).toHaveText(
        'Directory up to date. 5 members.',
      )
    } finally {
      await docs.close()
    }
  })

  test('docs prose styles do not leak into the demo text', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const preview = await openTablePage(page, docs.url)
      const title = preview.getByRole('heading', { name: 'Team directory' })
      const titleStyle = await title.evaluate((el) => {
        const style = getComputedStyle(el)
        return {
          marginTop: style.marginTop,
          borderTop: style.borderTopWidth,
          paddingTop: style.paddingTop,
        }
      })
      expect(titleStyle).toEqual({
        marginTop: '0px',
        borderTop: '0px',
        paddingTop: '0px',
      })
      // VitePress zebra rows and boxed cells stay out of the themed table.
      const cell = preview.locator('tbody td').first()
      const cellStyle = await cell.evaluate((el) => {
        const style = getComputedStyle(el)
        const row = getComputedStyle(el.parentElement ?? el)
        return {
          borderLeft: style.borderLeftWidth,
          rowBackground: row.backgroundColor,
        }
      })
      expect(cellStyle.borderLeft).toBe('0px')
      expect(cellStyle.rowBackground).toBe('rgba(0, 0, 0, 0)')
      await expect(preview.locator('table')).toHaveCSS('display', 'table')
    } finally {
      await docs.close()
    }
  })
})
