import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Popover page leads with the `popover/share-settings` showcase. These
 * checks cover what a screenshot cannot prove on its own: the panel's name and
 * focus entry, keyboard operation of every setting with real focus, live
 * outcomes in the summary, each dismissal path and where focus lands, panel
 * placement near viewport edges (LTR and RTL), the themed inline surface
 * in light and dark, stable hover and focus geometry, and no docs prose styles
 * in example text.
 */
const id = 'popover/share-settings'
const modes = ['light', 'dark'] as const

async function openPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/popover.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(page: Page, frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  const panel = page.getByRole('dialog', { name: 'Share “Q3 launch plan”' })
  return {
    preview,
    panel,
    trigger: preview.getByRole('button', { name: 'Share', exact: true }),
    access: (name: string) => panel.getByRole('radio', { name }),
    role: (name: string) => panel.getByRole('button', { name, exact: true }),
    toggle: (name: string) => panel.getByRole('switch', { name }),
    done: panel.getByRole('button', { name: 'Done' }),
    status: preview.getByRole('status'),
  }
}

// Retry the first activation until hydration has attached the handlers.
async function openPanel(
  trigger: Locator,
  panel: Locator,
  activate: (trigger: Locator) => Promise<void> = (target) => target.click(),
): Promise<void> {
  await expect(async () => {
    if (await panel.isVisible()) return
    await activate(trigger)
    await expect(panel).toBeVisible({ timeout: 500 })
  }).toPass()
}

test.describe('docs Popover sharing settings showcase', () => {
  test('leads the page and passes axe closed and open in light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        await expect(frame).toHaveAttribute('data-example-layer', 'themed')
        const closed = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(closed.violations).toEqual([])

        const { trigger, panel, access } = partsOf(page, frame)
        await openPanel(trigger, panel)
        // Exercise the enabled link permission state as well.
        await access('Anyone with the link').check()
        const open = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .analyze()
        expect(open.violations).toEqual([])
        await page.keyboard.press('Escape')
        await expect(panel).toHaveCount(0)
      }
    } finally {
      await docs.close()
    }
  })

  test('operates every setting from the keyboard with real focus', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { trigger, panel, access, role, toggle, done, status } = partsOf(
        page,
        frame,
      )

      await trigger.focus()
      await openPanel(trigger, panel, (target) => target.press('Enter'))
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
      await expect(trigger).toHaveAttribute(
        'aria-controls',
        (await panel.getAttribute('id')) ?? '',
      )
      await expect(panel).not.toHaveAttribute('aria-modal', 'true')
      await expect(access('Restricted')).toBeFocused()
      await expect(access('Restricted')).toBeChecked()
      await expect(role('Viewer')).toBeDisabled()

      // Native radios: arrows move the checked option and focus together.
      await page.keyboard.press('ArrowDown')
      await expect(access('Northwind workspace')).toBeFocused()
      await expect(access('Northwind workspace')).toBeChecked()
      await expect(status).toContainText(
        'Anyone at Northwind can view this plan.',
      )
      await page.keyboard.press('ArrowDown')
      await expect(access('Anyone with the link')).toBeFocused()
      await expect(status).toContainText(
        'Anyone with the link can view this plan.',
      )

      // Tab reaches the link permission, then each switch, then Done.
      await page.keyboard.press('Tab')
      await expect(role('Viewer')).toBeFocused()
      await expect(role('Viewer')).toHaveAttribute('aria-pressed', 'true')
      // The segments are one Tab stop; arrows move focus between them.
      await page.keyboard.press('ArrowRight')
      await expect(role('Commenter')).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(role('Commenter')).toHaveAttribute('aria-pressed', 'true')
      await expect(role('Viewer')).toHaveAttribute('aria-pressed', 'false')
      await expect(status).toContainText(
        'Anyone with the link can comment on this plan.',
      )
      await page.keyboard.press('ArrowRight')
      await expect(role('Editor')).toBeFocused()
      await page.keyboard.press('Space')
      await expect(status).toContainText(
        'Anyone with the link can edit this plan.',
      )

      const reshare = toggle('Editors can invite others')
      const download = toggle('Viewers can download')
      await page.keyboard.press('Tab')
      await expect(reshare).toBeFocused()
      await page.keyboard.press('Space')
      await expect(reshare).toHaveAttribute('aria-checked', 'false')
      await page.keyboard.press('Tab')
      await expect(download).toBeFocused()
      await page.keyboard.press('Space')
      await expect(download).toHaveAttribute('aria-checked', 'true')
      await expect(status).toContainText(
        'Only the owner can invite; viewers can download.',
      )

      await page.keyboard.press('Tab')
      await expect(done).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(panel).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      // Space reopens with the saved settings; Escape closes back to Share.
      await page.keyboard.press('Space')
      await expect(panel).toBeVisible()
      await expect(access('Anyone with the link')).toBeFocused()
      await expect(role('Editor')).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  test('tabs through the inline panel in page order without trapping focus @cross-browser', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { trigger, panel, access, toggle, done } = partsOf(page, frame)
      const restricted = access('Restricted')
      const nextPageLink = page.getByRole('link', {
        name: 'Permalink to "Basic use"',
      })
      const nextExampleCode = page.getByRole('button', {
        name: 'Basic source code',
        exact: true,
      })

      await trigger.focus()
      await openPanel(trigger, panel, (target) => target.press('Enter'))
      await expect(restricted).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(trigger).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(restricted).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(toggle('Editors can invite others')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(toggle('Viewers can download')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(done).toBeFocused()
      await page.keyboard.press('Tab')
      // Some browser preferences skip links in the Tab order.
      await expect(
        nextPageLink.or(nextExampleCode).and(page.locator(':focus')),
      ).toBeFocused()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Shift+Tab')
      await expect(done).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  test('dismisses by trigger and outside clicks', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1280, height: 1200 })
      const frame = await openPage(page, docs.url)
      const { trigger, panel, preview } = partsOf(page, frame)
      // Leave room below Share so the panel opens clear of both click targets.
      await trigger.evaluate((element) => {
        window.scrollBy(0, element.getBoundingClientRect().top - 430)
      })

      // The open trigger toggles closed cleanly instead of reopening.
      await openPanel(trigger, panel)
      await trigger.click()
      await expect(panel).toHaveCount(0)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      // A click on non-focusable page content closes the panel.
      await openPanel(trigger, panel)
      await preview.getByRole('heading', { name: 'Q3 launch plan' }).click()
      await expect(panel).toHaveCount(0)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      // A click on another control closes and leaves focus on that control.
      await openPanel(trigger, panel)
      const copy = frame.getByRole('button', { name: 'Copy' }).first()
      await copy.click()
      await expect(panel).toHaveCount(0)
      await expect(copy).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  for (const dir of ['ltr', 'rtl'] as const) {
    test(`keeps the panel inside a phone viewport near the edges (${dir})`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        const viewport = { width: 320, height: 568 }
        await page.setViewportSize(viewport)
        const frame = await openPage(page, docs.url)
        await page.evaluate((value) => {
          document.documentElement.dir = value
        }, dir)
        const { trigger, panel } = partsOf(page, frame)

        // Put the trigger near the bottom edge so the panel flips above it.
        await trigger.evaluate((element) => {
          const box = element.getBoundingClientRect()
          window.scrollBy(0, box.bottom - window.innerHeight + 16)
        })
        await openPanel(trigger, panel)
        await expect(panel).toHaveAttribute('data-placement', /^top/)
        const triggerBox = await trigger.boundingBox()
        const panelBox = await panel.boundingBox()
        if (!triggerBox || !panelBox) throw new Error('unmeasured panel')
        expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(triggerBox.y)
        expect(panelBox.y).toBeGreaterThanOrEqual(0)
        // The flip and shift padding keep an 8px gap from the inline edges.
        expect(panelBox.x).toBeGreaterThanOrEqual(8)
        expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
          viewport.width - 8,
        )
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(0)
        // Settings stay readable: nothing inside the panel overflows it.
        expect(
          await panel.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        ).toBeLessThanOrEqual(0)

        await page.keyboard.press('Escape')
        await expect(trigger).toBeFocused()
      } finally {
        await docs.close()
      }
    })
  }

  test('opens below the trigger when there is room', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1280, height: 1200 })
      const frame = await openPage(page, docs.url)
      const { trigger, panel } = partsOf(page, frame)
      await trigger.evaluate((element) => {
        window.scrollBy(0, element.getBoundingClientRect().top - 120)
      })
      await openPanel(trigger, panel)
      await expect(panel).toHaveAttribute('data-placement', 'bottom-end')
      // Opening motion scales the panel briefly. Measure the settled edges.
      await expect
        .poll(async () => {
          const triggerBox = await trigger.boundingBox()
          const panelBox = await panel.boundingBox()
          if (!triggerBox || !panelBox) throw new Error('unmeasured panel')
          const endDelta =
            panelBox.x + panelBox.width - (triggerBox.x + triggerBox.width)
          return {
            below: panelBox.y >= triggerBox.y + triggerBox.height,
            aligned: Math.abs(endDelta) <= 1,
          }
        })
        .toEqual({ below: true, aligned: true })
    } finally {
      await docs.close()
    }
  })

  test('the inline panel follows light and dark tokens', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const surfaces: Record<string, { bg: string; fg: string }> = {}
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        const { trigger, panel } = partsOf(page, frame)
        await openPanel(trigger, panel)
        await expect(
          frame.getByRole('dialog', { name: 'Share “Q3 launch plan”' }),
        ).toBeVisible()
        surfaces[mode] = await panel.evaluate((element) => {
          const computed = getComputedStyle(element)
          return { bg: computed.backgroundColor, fg: computed.color }
        })
        expect(surfaces[mode].bg).not.toMatch(
          /^(transparent|rgba\(0, 0, 0, 0\))$/,
        )
        await page.keyboard.press('Escape')
      }
      expect(surfaces.light?.bg).not.toBe(surfaces.dark?.bg)
      expect(surfaces.light?.fg).not.toBe(surfaces.dark?.fg)
    } finally {
      await docs.close()
    }
  })

  test('hover and focus keep geometry and example text keeps its own type', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { trigger, panel, preview, access, toggle } = partsOf(page, frame)

      const idle = await trigger.boundingBox()
      await trigger.hover()
      expect(await trigger.boundingBox()).toEqual(idle)
      await trigger.focus()
      expect(await trigger.boundingBox()).toEqual(idle)
      const ringFits = await trigger.evaluate((element) => {
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

      // Docs prose margins and heading styles stay out of the card text.
      const heading = await preview
        .getByRole('heading', { level: 2 })
        .evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            border: computed.borderTopWidth,
            padding: computed.paddingBlockStart,
          }
        })
      expect(heading).toEqual({ margin: '0px', border: '0px', padding: '0px' })
      const list = await preview
        .getByRole('list', { name: 'People with access' })
        .evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            padding: computed.paddingInlineStart,
            style: computed.listStyleType,
          }
        })
      expect(list).toEqual({ margin: '0px', padding: '0px', style: 'none' })

      await openPanel(trigger, panel)
      const option = access('Northwind workspace')
      // The ring and the checked dot share one grid cell, so the dot is drawn
      // inside the ring rather than above it.
      await option.check()
      const cells = await option.evaluate((element) => ({
        ring: getComputedStyle(element, '::before').gridRowStart,
        dot: getComputedStyle(element, '::after').gridRowStart,
      }))
      expect(cells).toEqual({ ring: '1', dot: '1' })

      // Hover and focus inside the panel never move the controls.
      const reshare = toggle('Editors can invite others')
      const before = await reshare.boundingBox()
      await reshare.hover()
      expect(await reshare.boundingBox()).toEqual(before)
      await reshare.focus()
      expect(await reshare.boundingBox()).toEqual(before)
      const optionBox = await option.boundingBox()
      await option.hover()
      expect(await option.boundingBox()).toEqual(optionBox)

      // Focus rings stay inside the panel surface.
      for (const control of [option, reshare]) {
        await control.focus()
        const inside = await control.evaluate((element) => {
          const surface = element.closest('[role="dialog"]')
          if (!surface) return false
          const box = element.getBoundingClientRect()
          const bounds = surface.getBoundingClientRect()
          const room = 4
          return (
            box.left - room >= bounds.left && box.right + room <= bounds.right
          )
        })
        expect(inside).toBe(true)
      }
    } finally {
      await docs.close()
    }
  })
})
