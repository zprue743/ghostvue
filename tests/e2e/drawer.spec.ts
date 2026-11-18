import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

const VIEWPORT = { width: 1024, height: 700 }

async function box(locator: Locator) {
  const rect = await locator.boundingBox()
  if (!rect) {
    throw new Error('Expected a rendered bounding box')
  }
  return rect
}

async function openWithClick(page: Page, testIdPrefix: string) {
  const trigger = page.getByTestId(`${testIdPrefix}-trigger`)
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  const content = page.getByTestId(`${testIdPrefix}-content`)
  await expect(content).toBeVisible()
  return { trigger, content }
}

test.describe('GhostDrawer', () => {
  test.use({ viewport: VIEWPORT })

  test('traps Tab, dismisses on Escape, overlay click, and Close, restores focus, and passes Axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('drawer-basic-trigger')
      const overlay = page.getByTestId('drawer-basic-overlay')
      const content = page.getByTestId('drawer-basic-content')
      const first = page.getByTestId('drawer-basic-first')
      const close = page.getByTestId('drawer-basic-close')

      await trigger.scrollIntoViewIfNeeded()
      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.click()
      await expect(content).toBeVisible()
      await expect(overlay).toBeVisible()
      await expect(content).toHaveAttribute('role', 'dialog')
      await expect(content).toHaveAttribute('aria-modal', 'true')
      await expect(content).toHaveAttribute('data-side', 'end')
      await expect(content).toHaveAttribute('data-dir', 'ltr')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
      await expect(first).toBeFocused()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(
        'hidden',
      )

      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      await page.keyboard.press('Tab')
      await expect(close).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(first).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(close).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(overlay).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      // Enter on the trigger reopens; clicking the backdrop dismisses.
      await page.keyboard.press('Enter')
      await expect(content).toBeVisible()
      await overlay.click({ position: { x: 8, y: 8 } })
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // Space on the trigger reopens; Enter on Close dismisses.
      await page.keyboard.press('Space')
      await expect(content).toBeVisible()
      await expect(first).toBeFocused()
      await close.focus()
      await page.keyboard.press('Enter')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
    } finally {
      await playground.close()
    }
  })

  test('anchors every side to the matching physical viewport edge in LTR', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      // Reduced motion removes the entry translate so geometry is final.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(playground.url)

      const expectations = {
        start: (r: Awaited<ReturnType<typeof box>>) => {
          expect(Math.round(r.x)).toBe(0)
          expect(Math.round(r.height)).toBe(VIEWPORT.height)
        },
        end: (r: Awaited<ReturnType<typeof box>>) => {
          expect(Math.round(r.x + r.width)).toBe(VIEWPORT.width)
          expect(Math.round(r.height)).toBe(VIEWPORT.height)
        },
        top: (r: Awaited<ReturnType<typeof box>>) => {
          expect(Math.round(r.y)).toBe(0)
          expect(Math.round(r.width)).toBe(VIEWPORT.width)
        },
        bottom: (r: Awaited<ReturnType<typeof box>>) => {
          expect(Math.round(r.y + r.height)).toBe(VIEWPORT.height)
          expect(Math.round(r.width)).toBe(VIEWPORT.width)
        },
      } as const

      for (const [side, check] of Object.entries(expectations)) {
        const { trigger, content } = await openWithClick(
          page,
          `drawer-side-${side}`,
        )
        await expect(content).toHaveAttribute('data-side', side)
        await expect(trigger).toHaveAttribute('data-side', side)
        check(await box(content))
        await page.keyboard.press('Escape')
        await expect(content).toHaveCount(0)
        await expect(trigger).toBeFocused()
      }
    } finally {
      await playground.close()
    }
  })

  test('flips logical start/end edges for a portaled drawer inside an RTL subtree @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(playground.url)

      const start = await openWithClick(page, 'drawer-rtl-start')
      // Portaled to <body>, outside the [dir="rtl"] region.
      expect(
        await start.content.evaluate(
          (element) => element.parentElement === document.body,
        ),
      ).toBe(true)
      await expect(start.content).toHaveAttribute('data-dir', 'rtl')
      await expect(start.content).toHaveAttribute('dir', 'rtl')
      const startBox = await box(start.content)
      expect(Math.round(startBox.x + startBox.width)).toBe(VIEWPORT.width)
      const rtlAxe = await new AxeBuilder({ page }).analyze()
      expect(rtlAxe.violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(start.trigger).toBeFocused()

      const end = await openWithClick(page, 'drawer-rtl-end')
      await expect(end.content).toHaveAttribute('data-dir', 'rtl')
      expect(Math.round((await box(end.content)).x)).toBe(0)
      await page.keyboard.press('Escape')
      await expect(end.trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('slides in only when motion is allowed and uses translate: none under reduced motion', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto(playground.url)
      // Motion tokens resolve under a theme host. Apps theme <html>, which also
      // covers drawers portaled to <body>.
      await page.evaluate(() => {
        document.documentElement.classList.add('ghost-theme')
      })

      let { content } = await openWithClick(page, 'drawer-side-end')
      const motion = await content.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          property: style.transitionProperty,
          duration: style.transitionDuration,
        }
      })
      expect(motion.property).toContain('translate')
      expect(motion.property).toContain('opacity')
      // The entry transition settles at the resting position.
      await expect
        .poll(() =>
          content.evaluate((element) => getComputedStyle(element).translate),
        )
        .toBe('none')
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)

      await page.emulateMedia({ reducedMotion: 'reduce' })
      ;({ content } = await openWithClick(page, 'drawer-side-end'))
      const reduced = await content.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          property: style.transitionProperty,
          translate: style.translate,
        }
      })
      expect(reduced.translate).toBe('none')
      expect(reduced.property).not.toContain('translate')
      expect(reduced.property).toContain('opacity')
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
    } finally {
      await playground.close()
    }
  })

  test('non-modal drawers leave the page interactive and keep focus on outside controls', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const { trigger, content } = await openWithClick(page, 'drawer-nonmodal')
      await expect(content).not.toHaveAttribute('aria-modal', /.*/)
      await expect(page.getByTestId('drawer-nonmodal-overlay')).toHaveCount(0)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      await expect(page.getByTestId('drawer-nonmodal-close')).toBeFocused()

      const nonModalAxe = await new AxeBuilder({ page }).analyze()
      expect(nonModalAxe.violations).toEqual([])

      // Escape closes and restores focus to the trigger.
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // An outside focusable control stays usable and keeps focus.
      await trigger.click()
      await expect(content).toBeVisible()
      const outside = page.getByTestId('drawer-outside-button')
      await outside.click()
      await expect(content).toHaveCount(0)
      await expect(outside).toBeFocused()
      await expect(outside).toContainText('(1)')
    } finally {
      await playground.close()
    }
  })

  test('a nested dialog owns Escape before the drawer @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const drawer = await openWithClick(page, 'drawer-nested')
      const dialogTrigger = page.getByTestId('drawer-nested-dialog-trigger')
      const dialog = page.getByTestId('drawer-nested-dialog-content')
      // The modal drawer moves focus to its first tabbable control on open;
      // wait for that before pressing keys so the trap cannot race the test.
      await expect(dialogTrigger).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(dialog).toBeVisible()
      await expect(page.getByTestId('drawer-nested-dialog-close')).toBeFocused()

      const nestedAxe = await new AxeBuilder({ page }).analyze()
      expect(nestedAxe.violations).toEqual([])

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(drawer.content).toBeVisible()
      await expect(dialogTrigger).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(drawer.content).toHaveCount(0)
      await expect(drawer.trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
