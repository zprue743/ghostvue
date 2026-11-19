import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { openPreviewWidth } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * The Button page leads with the `button/action-bar` showcase. These checks
 * cover what a screenshot cannot prove on its own: the pending publish keeps
 * its geometry and focus, hover and focus never move the row, focus rings
 * fit inside the frame, the layout follows the preview width (not the
 * viewport), and docs prose styles stay out of the example text.
 */
const id = 'button/action-bar'
const modes = ['light', 'dark'] as const

async function openButtonPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/button.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function actionsOf(frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  return {
    preview,
    discard: preview.getByRole('button', { name: 'Discard changes' }),
    save: preview.getByRole('button', { name: 'Save draft' }),
    publish: preview.getByRole('button', { name: 'Publish' }),
    status: preview.getByRole('status'),
  }
}

test.describe('docs Button action bar showcase', () => {
  test('leads the page and passes axe in light and dark', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openButtonPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        // Only headless frames carry a badge; the layer is on the figure.
        await expect(frame).toHaveAttribute('data-example-layer', 'themed')
        const axe = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(axe.violations).toEqual([])
      }
    } finally {
      await docs.close()
    }
  })

  test('pending publish keeps its size and focus and reports the result', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openButtonPage(page, docs.url)
      const { publish, status } = actionsOf(frame)
      const idle = await publish.boundingBox()

      await publish.focus()
      // Retry until hydration has attached the click handler.
      await expect(async () => {
        await publish.press('Enter')
        await expect(publish).toHaveAttribute('aria-busy', 'true', {
          timeout: 500,
        })
      }).toPass()
      await expect(publish).toBeFocused()
      await expect(publish).toHaveAttribute('aria-disabled', 'true')
      await expect(status).toHaveText('Publishing to 3 channels…')
      expect(await publish.boundingBox()).toEqual(idle)

      await expect(status).toHaveText('Published to 3 channels')
      await expect(publish).not.toHaveAttribute('aria-busy', 'true')
      expect(await publish.boundingBox()).toEqual(idle)
    } finally {
      await docs.close()
    }
  })

  test('the Publishing control previews loading without moving the row', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openButtonPage(page, docs.url)
      const { discard, save, publish } = actionsOf(frame)
      const boxes = async () =>
        Promise.all([discard, save, publish].map((b) => b.boundingBox()))
      const before = await boxes()

      const toggle = frame.getByRole('checkbox', { name: 'Publishing' })
      await expect(async () => {
        await toggle.check()
        await expect(publish).toHaveAttribute('aria-busy', 'true', {
          timeout: 500,
        })
      }).toPass()
      expect(await boxes()).toEqual(before)
      await expect(frame.getByTestId('ghost-playground-summary')).toContainText(
        'loading',
      )
    } finally {
      await docs.close()
    }
  })

  test('hover and focus keep geometry and focus rings fit the frame', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openButtonPage(page, docs.url)
      const { discard, save, publish } = actionsOf(frame)
      for (const button of [discard, save, publish]) {
        const idle = await button.boundingBox()
        await button.hover()
        expect(await button.boundingBox()).toEqual(idle)
        await button.focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await expect(button).toBeFocused()
        expect(await button.boundingBox()).toEqual(idle)

        // The themed ring is an outline plus box-shadow; leave room for both.
        const ringFits = await button.evaluate((element) => {
          const clip = element.closest('.ghost-example')
          if (!clip) return false
          const box = element.getBoundingClientRect()
          const bounds = clip.getBoundingClientRect()
          const room = 6
          return (
            box.left - room >= bounds.left &&
            box.right + room <= bounds.right &&
            box.bottom + room <= bounds.bottom
          )
        })
        expect(ringFits).toBe(true)
      }
    } finally {
      await docs.close()
    }
  })

  test('layout follows the preview width, not the viewport', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openButtonPage(page, docs.url)
      const { discard, save, publish } = actionsOf(frame)

      // Wide canvas: destructive at the start, Save and Publish on its row.
      const wide = await Promise.all(
        [discard, save, publish].map((b) => b.boundingBox()),
      )
      const [discardWide, saveWide, publishWide] = wide.map((box) => {
        if (!box) throw new Error('unmeasured action')
        return box
      })
      expect(Math.abs(discardWide.y - publishWide.y)).toBeLessThan(2)
      expect(discardWide.x).toBeLessThan(saveWide.x)
      expect(saveWide.x).toBeLessThan(publishWide.x)

      await openPreviewWidth(page, id)
      await frame.getByRole('radio', { name: '320' }).check()

      // Narrow canvas: destructive on its own row above equal halves.
      await expect(async () => {
        const [d, s, p] = await Promise.all(
          [discard, save, publish].map((b) => b.boundingBox()),
        )
        if (!d || !s || !p) throw new Error('unmeasured action')
        expect(d.y + d.height).toBeLessThanOrEqual(s.y)
        expect(Math.abs(s.y - p.y)).toBeLessThan(1)
        expect(Math.abs(s.width - p.width)).toBeLessThan(1)
      }).toPass()
    } finally {
      await docs.close()
    }
  })

  test('example text keeps its own type and no docs prose spacing', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openButtonPage(page, docs.url)
      const { preview, status } = actionsOf(frame)
      const title = preview.getByText('Quarterly product update')
      const read = (locator: Locator) =>
        locator.evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            weight: computed.fontWeight,
            size: Number.parseFloat(computed.fontSize),
          }
        })
      const titleStyles = await read(title)
      const statusStyles = await read(status)
      expect(titleStyles.margin).toBe('0px')
      expect(statusStyles.margin).toBe('0px')
      expect(Number(titleStyles.weight)).toBeGreaterThanOrEqual(600)
      expect(statusStyles.size).toBeLessThan(titleStyles.size)
    } finally {
      await docs.close()
    }
  })
})
