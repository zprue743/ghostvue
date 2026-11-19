import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { openPreviewWidth } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * The Checkbox page leads with the `checkbox/notification-preferences`
 * showcase. These checks cover what a screenshot cannot prove on its own:
 * real keyboard toggling and the mixed select-all, label/box alignment, hover
 * and focus never moving a row, focus rings that fit the frame, the action
 * layout following the preview width (not the viewport), no horizontal
 * overflow on a phone, and docs prose styles staying out of example text.
 */
const id = 'checkbox/notification-preferences'
const modes = ['light', 'dark'] as const

async function openCheckboxPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/checkbox.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  return {
    preview,
    all: preview.getByRole('checkbox', { name: 'All project activity' }),
    mentions: preview.getByRole('checkbox', { name: 'Comments and mentions' }),
    digest: preview.getByRole('checkbox', { name: 'Weekly digest' }),
    security: preview.getByRole('checkbox', { name: 'Security alerts' }),
    billing: preview.getByRole('checkbox', { name: 'Billing receipts' }),
    save: preview.getByRole('button', { name: 'Save preferences' }),
    status: preview.getByRole('status'),
  }
}

test.describe('docs Checkbox notification preferences showcase', () => {
  test('leads the page and passes axe in light and dark', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openCheckboxPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
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

  test('keyboard toggles options and resolves the mixed select-all', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openCheckboxPage(page, docs.url)
      const { all, mentions, digest, security, save, status } = partsOf(frame)

      await expect(all).toHaveJSProperty('indeterminate', true)
      await expect(all).toHaveAttribute('data-state', 'indeterminate')
      await expect(security).toBeChecked()
      await expect(security).toBeDisabled()

      await all.focus()
      // Retry until hydration has attached the change handler.
      await expect(async () => {
        await page.keyboard.press('Space')
        await expect(digest).toBeChecked({ timeout: 500 })
      }).toPass()
      await expect(all).toBeFocused()
      await expect(all).toBeChecked()
      await expect(all).toHaveJSProperty('indeterminate', false)

      // Tab moves to the first child; Space unchecks it and mixed returns.
      await page.keyboard.press('Tab')
      await expect(mentions).toBeFocused()
      await page.keyboard.press('Space')
      await expect(mentions).not.toBeChecked()
      await expect(all).toHaveJSProperty('indeterminate', true)
      await expect(all).toHaveAttribute('data-state', 'indeterminate')

      // Clicking the label text toggles its checkbox.
      await frame.getByText('Weekly digest', { exact: true }).click()
      await expect(digest).not.toBeChecked()

      await save.click()
      await expect(status).toHaveText('Preferences saved.')
    } finally {
      await docs.close()
    }
  })

  test('labels align with their boxes and targets are full size', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openCheckboxPage(page, docs.url)
      const { preview } = partsOf(frame)
      const rows = await preview.locator('.pref').evaluateAll((fields) =>
        fields.map((field) => {
          const input = field.querySelector('input')
          const label = field.querySelector('[data-part="label"]')
          const description = field.querySelector('[data-part="description"]')
          if (!input || !label || !description) return null
          const box = input.getBoundingClientRect()
          const text = label.getBoundingClientRect()
          const hint = description.getBoundingClientRect()
          const line = Number.parseFloat(getComputedStyle(label).lineHeight)
          const padding = Number.parseFloat(getComputedStyle(label).paddingTop)
          return {
            width: box.width,
            height: box.height,
            boxCenter: box.top + box.height / 2,
            firstLineCenter: text.top + padding + line / 2,
            labelLeft: text.left,
            hintLeft: hint.left,
            hintTop: hint.top,
            labelBottom: text.bottom,
            boxRight: box.right,
          }
        }),
      )
      expect(rows).toHaveLength(6)
      for (const row of rows) {
        if (!row) throw new Error('unmeasured option')
        // WCAG 2.5.8 minimum target, from the control-size token.
        expect(row.width).toBeGreaterThanOrEqual(24)
        expect(row.height).toBeGreaterThanOrEqual(24)
        expect(Math.abs(row.boxCenter - row.firstLineCenter)).toBeLessThan(1.5)
        expect(row.labelLeft).toBeGreaterThan(row.boxRight)
        expect(Math.abs(row.hintLeft - row.labelLeft)).toBeLessThan(1)
        expect(row.hintTop).toBeGreaterThanOrEqual(row.labelBottom - 0.5)
      }
    } finally {
      await docs.close()
    }
  })

  test('hover and focus keep geometry and focus rings fit the frame', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openCheckboxPage(page, docs.url)
      const { all, mentions, billing, save } = partsOf(frame)
      const rows = frame.getByTestId('ghost-example-preview').locator('.pref')
      const rowBoxes = async () =>
        rows.evaluateAll((fields) =>
          fields.map((field) => {
            const { x, y, width, height } = field.getBoundingClientRect()
            return { x, y, width, height }
          }),
        )
      const before = await rowBoxes()

      for (const control of [all, mentions, billing, save]) {
        await control.hover()
        expect(await rowBoxes()).toEqual(before)
        await control.focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await expect(control).toBeFocused()
        expect(await rowBoxes()).toEqual(before)

        const ringFits = await control.evaluate((element) => {
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

      // The checkbox ring is drawn on the painted box with an outline.
      const ring = await all.evaluate((element) => {
        const before = getComputedStyle(element, '::before')
        return {
          style: before.outlineStyle,
          width: Number.parseFloat(before.outlineWidth),
        }
      })
      await all.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const focused = await all.evaluate((element) => {
        const before = getComputedStyle(element, '::before')
        return {
          style: before.outlineStyle,
          width: Number.parseFloat(before.outlineWidth),
        }
      })
      expect(ring.style === 'none' || ring.width === 0).toBe(true)
      expect(focused.style).toBe('solid')
      expect(focused.width).toBeGreaterThan(0)
    } finally {
      await docs.close()
    }
  })

  test('actions follow the preview width, not the viewport', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openCheckboxPage(page, docs.url)
      const { preview, save } = partsOf(frame)
      const restore = preview.getByRole('button', { name: 'Restore defaults' })

      // Wide canvas: both actions share a row, Save at the end.
      const r = await restore.boundingBox()
      const s = await save.boundingBox()
      if (!r || !s) throw new Error('unmeasured action')
      expect(Math.abs(r.y - s.y)).toBeLessThan(2)
      expect(r.x + r.width).toBeLessThan(s.x)

      await openPreviewWidth(page, id)
      await frame.getByRole('radio', { name: '320' }).check()

      // Narrow canvas: full-width actions stacked, labels on one line.
      await expect(async () => {
        const rn = await restore.boundingBox()
        const sn = await save.boundingBox()
        if (!rn || !sn) throw new Error('unmeasured action')
        expect(rn.y + rn.height).toBeLessThanOrEqual(sn.y)
        expect(Math.abs(rn.width - sn.width)).toBeLessThan(1)
        expect(Math.abs(rn.x - sn.x)).toBeLessThan(1)
        expect(sn.height).toBeLessThan(s.height + 1)
      }).toPass()
    } finally {
      await docs.close()
    }
  })

  test('fits a phone viewport without horizontal overflow', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      const frame = await openCheckboxPage(page, docs.url)
      const { preview } = partsOf(frame)
      const overflow = await preview.evaluate((element) => ({
        preview: element.scrollWidth - element.clientWidth,
        page: document.documentElement.scrollWidth - window.innerWidth,
      }))
      expect(overflow.preview).toBeLessThanOrEqual(0)
      expect(overflow.page).toBeLessThanOrEqual(0)
    } finally {
      await docs.close()
    }
  })

  test('example text keeps its own type and no docs prose spacing', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openCheckboxPage(page, docs.url)
      const { preview } = partsOf(frame)
      const read = (locator: Locator) =>
        locator.evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            border: computed.borderTopWidth,
            weight: Number(computed.fontWeight),
            size: Number.parseFloat(computed.fontSize),
          }
        })
      const title = await read(
        preview.getByRole('heading', { name: 'Email notifications' }),
      )
      const group = await read(
        preview.getByRole('heading', { name: 'Project activity' }),
      )
      const hint = await read(
        preview.getByText('A Monday summary of activity across your projects.'),
      )
      for (const styles of [title, group, hint]) {
        expect(styles.margin).toBe('0px')
      }
      // `.vp-doc h2` draws a divider; the example heading must not.
      expect(title.border).toBe('0px')
      expect(title.weight).toBeGreaterThanOrEqual(600)
      expect(group.size).toBeLessThan(title.size)
      expect(hint.size).toBeLessThanOrEqual(group.size)
    } finally {
      await docs.close()
    }
  })
})
