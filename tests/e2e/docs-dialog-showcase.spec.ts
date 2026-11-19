import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Dialog page leads with the `dialog/edit-profile` showcase. These checks
 * cover what a screenshot cannot prove on its own: real save and cancel
 * outcomes, the focus trap and focus return, Escape, scrolling when the form
 * is taller than the viewport, centering in RTL, themed body-portal surfaces
 * in light and dark, stable hover and focus geometry, and no docs prose
 * styles in the example text.
 */
const id = 'dialog/edit-profile'
const modes = ['light', 'dark'] as const

async function openDialogPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/dialog.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(page: Page, frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  return {
    preview,
    trigger: preview.getByRole('button', { name: 'Edit profile', exact: true }),
    name: preview.getByRole('heading', { level: 2 }),
    status: preview.getByRole('status'),
    dialog,
    fullName: dialog.getByRole('textbox', { name: /Full name/ }),
    email: dialog.getByRole('textbox', { name: /Work email/ }),
    save: dialog.getByRole('button', { name: 'Save changes' }),
    cancel: dialog.getByRole('button', { name: 'Cancel' }),
  }
}

// Retry the first activation until hydration has attached the handlers.
async function openEditor(
  trigger: Locator,
  dialog: Locator,
  activate: (trigger: Locator) => Promise<void> = (target) => target.click(),
): Promise<void> {
  await expect(async () => {
    await activate(trigger)
    await expect(dialog).toBeVisible({ timeout: 500 })
  }).toPass()
}

test.describe('docs Dialog edit profile showcase', () => {
  test('leads the page and passes axe closed and open in light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openDialogPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        await expect(frame).toHaveAttribute('data-example-layer', 'themed')
        const closed = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(closed.violations).toEqual([])

        const { trigger, dialog } = partsOf(page, frame)
        await openEditor(trigger, dialog)
        const open = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .analyze()
        expect(open.violations).toEqual([])
      }
    } finally {
      await docs.close()
    }
  })

  test('traps focus, discards on Escape, and returns focus to the trigger', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openDialogPage(page, docs.url)
      const { trigger, dialog, fullName, save, cancel, name, status } = partsOf(
        page,
        frame,
      )

      await trigger.focus()
      await openEditor(trigger, dialog, (target) => target.press('Enter'))
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      // Default entry: the first tabbable element, the Full name field.
      await expect(fullName).toBeFocused()

      // Shift+Tab from the first field wraps to Save; Tab wraps back.
      await page.keyboard.press('Shift+Tab')
      await expect(save).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(cancel).toBeFocused()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await expect(fullName).toBeFocused()

      await fullName.fill('Somebody else')
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(name).toHaveText('Ada Lovelace')
      await expect(status).toHaveText('Edits discarded.')

      // Cancel discards too, and the next session starts from saved values.
      await page.keyboard.press('Enter')
      await expect(fullName).toHaveValue('Ada Lovelace')
      await fullName.fill('Another name')
      await cancel.click()
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(name).toHaveText('Ada Lovelace')
    } finally {
      await docs.close()
    }
  })

  test('saves valid edits and keeps the dialog open on invalid ones', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openDialogPage(page, docs.url)
      const { trigger, dialog, fullName, email, save, name, status } = partsOf(
        page,
        frame,
      )

      await openEditor(trigger, dialog)
      await email.fill('ada@analytical-engines')
      await save.click()
      await expect(dialog).toBeVisible()
      await expect(email).toHaveAttribute('aria-invalid', 'true')
      await expect(email).toBeFocused()
      await expect(dialog.getByRole('alert')).toHaveText(
        'Enter an address like name@company.com.',
      )

      await email.fill('ada@analytical-engines.example')
      await expect(email).not.toHaveAttribute('aria-invalid', 'true')
      await fullName.fill('Ada King')
      await save.click()
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(name).toHaveText('Ada King')
      await expect(status).toHaveText('Profile saved.')
    } finally {
      await docs.close()
    }
  })

  test('scrolls a tall form inside the viewport on a short phone screen', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 375, height: 480 })
      const frame = await openDialogPage(page, docs.url)
      const { trigger, dialog, save } = partsOf(page, frame)
      await openEditor(trigger, dialog)

      const metrics = await dialog.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return {
          scrolls: element.scrollHeight > element.clientHeight,
          top: box.top,
          bottom: box.bottom,
          left: box.left,
          right: box.right,
        }
      })
      expect(metrics.scrolls).toBe(true)
      expect(metrics.top).toBeGreaterThanOrEqual(0)
      expect(metrics.bottom).toBeLessThanOrEqual(480)
      expect(metrics.left).toBeGreaterThanOrEqual(0)
      expect(metrics.right).toBeLessThanOrEqual(375)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(0)

      // The actions are reachable by scrolling the dialog, not the page.
      await save.scrollIntoViewIfNeeded()
      await expect(save).toBeInViewport()
      expect(
        await dialog.evaluate((element) => element.scrollTop),
      ).toBeGreaterThan(0)
    } finally {
      await docs.close()
    }
  })

  test('stays centered in RTL for the hero and the long-content sample', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1000, height: 800 })
      const frame = await openDialogPage(page, docs.url)
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl'
      })
      const samples = [
        { frame, trigger: 'Edit profile', dialog: 'Edit profile' },
        {
          frame: page.locator('[data-example-id="dialog/themed"]'),
          trigger: "What's new in 4.2",
          dialog: "What's new in 4.2",
        },
      ]
      for (const sample of samples) {
        await sample.frame.scrollIntoViewIfNeeded()
        const trigger = sample.frame
          .getByTestId('ghost-example-preview')
          .getByRole('button', { name: sample.trigger, exact: true })
        const dialog = page.getByRole('dialog', { name: sample.dialog })
        await openEditor(trigger, dialog)
        const box = await dialog.boundingBox()
        if (!box) throw new Error('unmeasured dialog')
        const startGap = box.x
        const endGap = 1000 - (box.x + box.width)
        expect(Math.abs(startGap - endGap)).toBeLessThan(1)
        expect(startGap).toBeGreaterThan(0)
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
        await expect(trigger).toBeFocused()
      }
    } finally {
      await docs.close()
    }
  })

  test('the body-portaled surface follows light and dark tokens', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const surfaces: Record<string, { bg: string; fg: string }> = {}
      for (const mode of modes) {
        const frame = await openDialogPage(page, docs.url, mode)
        const { trigger, dialog } = partsOf(page, frame)
        await openEditor(trigger, dialog)
        // Portaled to <body>, outside the docs frame.
        expect(
          await dialog.evaluate(
            (element) =>
              element.parentElement === document.body &&
              element.closest('.ghost-example') === null,
          ),
        ).toBe(true)
        surfaces[mode] = await dialog.evaluate((element) => {
          const computed = getComputedStyle(element)
          return { bg: computed.backgroundColor, fg: computed.color }
        })
        expect(surfaces[mode].bg).not.toMatch(
          /^(transparent|rgba\(0, 0, 0, 0\))$/,
        )
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
      const frame = await openDialogPage(page, docs.url)
      const { trigger, dialog, fullName, name, preview } = partsOf(page, frame)

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
      const read = (locator: Locator) =>
        locator.evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            border: computed.borderTopWidth,
            size: Number.parseFloat(computed.fontSize),
          }
        })
      const heading = await read(name)
      expect(heading.margin).toBe('0px')
      expect(heading.border).toBe('0px')
      const detail = await read(preview.locator('dd').first())
      expect(detail.margin).toBe('0px')
      expect(detail.size).toBeLessThan(heading.size)

      // Inside the dialog, focusing a field never moves it.
      await openEditor(trigger, dialog)
      const email = partsOf(page, frame).email
      const before = await email.boundingBox()
      await email.hover()
      await email.focus()
      expect(await email.boundingBox()).toEqual(before)
      await expect(fullName).not.toBeFocused()
    } finally {
      await docs.close()
    }
  })
})
