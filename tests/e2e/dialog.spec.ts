import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

// Show classic scrollbars in headless Chromium so scroll-lock padding-right
// compensation and zero horizontal layout shift are genuinely exercised.
test.use({
  launchOptions: {
    args: ['--blink-settings=hideScrollbars=false'],
  },
})

test.describe('GhostDialog', () => {
  test('traps Tab/Shift+Tab, dismisses on Escape and overlay click, restores focus, and passes Axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('dialog-basic-trigger')
      const overlay = page.getByTestId('dialog-basic-overlay')
      const content = page.getByTestId('dialog-basic-content')
      const firstAction = page.getByTestId('dialog-basic-first')
      const closeButton = page.getByTestId('dialog-basic-close')

      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.click()
      await expect(overlay).toBeVisible()
      await expect(content).toBeVisible()
      await expect(content).toHaveAttribute('role', 'dialog')
      await expect(content).toHaveAttribute('aria-modal', 'true')
      await expect(content).toHaveAttribute('data-state', 'open')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(firstAction).toBeFocused()

      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      // Tab forward wraps from last -> first; Shift+Tab wraps from first -> last.
      await page.keyboard.press('Tab')
      await expect(closeButton).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(firstAction).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(closeButton).toBeFocused()

      // Escape closes and restores focus to trigger.
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(overlay).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // Reopen via keyboard and close by clicking backdrop overlay outside content.
      await page.keyboard.press('Enter')
      await expect(content).toBeVisible()
      await overlay.click({ position: { x: 8, y: 8 } })
      await expect(content).toHaveCount(0)
      await expect(overlay).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('honors closeOnEscape=false and closeOnOutsideClick=false', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('dialog-locked-trigger')
      const overlay = page.getByTestId('dialog-locked-overlay')
      const content = page.getByTestId('dialog-locked-content')
      const closeButton = page.getByTestId('dialog-locked-close')

      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      await expect(content).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(content).toBeVisible()

      await overlay.click({ position: { x: 8, y: 8 } })
      await expect(content).toBeVisible()

      await closeButton.click()
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('locks body scroll without horizontal layout shift and marks background inert while skipping [data-ghost-live]', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 1024, height: 600 })
      await page.goto(playground.url)

      const before = await page.evaluate(() => {
        window.scrollTo(0, 120)
        const main = document.querySelector('main')
        return {
          scrollY: window.scrollY,
          scrollbarWidth:
            window.innerWidth - document.documentElement.clientWidth,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
        }
      })
      expect(before.scrollY).toBeGreaterThan(0)
      expect(before.scrollbarWidth).toBeGreaterThan(0)

      const trigger = page.getByTestId('dialog-basic-trigger')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()

      const content = page.getByTestId('dialog-basic-content')
      await expect(content).toBeVisible()

      const baselineScroll = await page.evaluate(() => window.scrollY)
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(100)

      const during = await page.evaluate((scrollStart) => {
        const main = document.querySelector('main')
        const app = document.getElementById('app')
        const live = document.querySelector(
          '[data-testid="dialog-live-region"]',
        )
        const outsideBtn = document.querySelector<HTMLButtonElement>(
          '[data-testid="dialog-outside-target"]',
        )
        outsideBtn?.focus()
        return {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          scrollDelta: window.scrollY - scrollStart,
          appInert: app?.hasAttribute('inert') ?? false,
          liveInert: live?.hasAttribute('inert') ?? false,
          outsideFocused: document.activeElement === outsideBtn,
        }
      }, baselineScroll)

      expect(during.overflow).toBe('hidden')
      expect(Number.parseFloat(during.paddingRight)).toBe(before.scrollbarWidth)
      expect(Math.abs(during.mainWidth - before.mainWidth)).toBeLessThan(1)
      expect(during.scrollDelta).toBe(0)
      expect(during.appInert).toBe(true)
      expect(during.liveInert).toBe(false)
      expect(during.outsideFocused).toBe(false)

      await page.getByTestId('dialog-basic-close').click()
      await expect(content).toHaveCount(0)

      const after = await page.evaluate(() => {
        const main = document.querySelector('main')
        const app = document.getElementById('app')
        const outsideBtn = document.querySelector<HTMLButtonElement>(
          '[data-testid="dialog-outside-target"]',
        )
        outsideBtn?.focus()
        return {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          appInert: app?.hasAttribute('inert') ?? false,
          outsideFocused: document.activeElement === outsideBtn,
        }
      })

      expect(after.overflow).toBe(before.overflow)
      expect(after.paddingRight).toBe(before.paddingRight)
      expect(Math.abs(after.mainWidth - before.mainWidth)).toBeLessThan(1)
      expect(after.appInert).toBe(false)
      expect(after.outsideFocused).toBe(true)
    } finally {
      await playground.close()
    }
  })

  test('dismisses nested modal dialogs one layer at a time on Escape', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const outerTrigger = page.getByTestId('dialog-nested-outer-trigger')
      const outerContent = page.getByTestId('dialog-nested-outer-content')
      const innerTrigger = page.getByTestId('dialog-nested-inner-trigger')
      const innerContent = page.getByTestId('dialog-nested-inner-content')

      await outerTrigger.scrollIntoViewIfNeeded()
      await outerTrigger.click()
      await expect(outerContent).toBeVisible()

      await innerTrigger.click()
      await expect(innerContent).toBeVisible()

      const nestedAxe = await new AxeBuilder({ page }).analyze()
      expect(nestedAxe.violations).toEqual([])

      // First Escape closes only the inner dialog and restores focus to innerTrigger.
      await page.keyboard.press('Escape')
      await expect(innerContent).toHaveCount(0)
      await expect(outerContent).toBeVisible()
      await expect(innerTrigger).toBeFocused()

      // Second Escape closes the outer dialog and restores focus to outerTrigger.
      await page.keyboard.press('Escape')
      await expect(outerContent).toHaveCount(0)
      await expect(outerTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('supports both portaled and portal=false popovers inside a modal dialog', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const dialogTrigger = page.getByTestId('dialog-popovers-trigger')
      const dialogContent = page.getByTestId('dialog-popovers-content')
      const dialogFirst = page.getByTestId('dialog-popovers-first')

      await dialogTrigger.scrollIntoViewIfNeeded()
      await dialogTrigger.click()
      await expect(dialogContent).toBeVisible()
      await expect(dialogFirst).toBeFocused()

      // 1. Portaled popover: Tab moves inside the portaled popover without getting pulled back.
      const portaledTrigger = page.getByTestId('dialog-pop-portaled-trigger')
      await portaledTrigger.click()
      const portaledContent = page.getByTestId('dialog-pop-portaled-content')
      await expect(portaledContent).toBeVisible()
      await expect(page.getByTestId('dialog-pop-portaled-input')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.getByTestId('dialog-pop-portaled-close')).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(portaledContent).toHaveCount(0)
      await expect(dialogContent).toBeVisible()
      await expect(portaledTrigger).toBeFocused()

      // 2. Inline (portal=false) popover: Tab past its last item stays inside the dialog (wraps to dialogFirst).
      const inlineTrigger = page.getByTestId('dialog-pop-inline-trigger')
      await inlineTrigger.click()
      const inlineContent = page.getByTestId('dialog-pop-inline-content')
      await expect(inlineContent).toBeVisible()
      await expect(page.getByTestId('dialog-pop-inline-action')).toBeFocused()

      await page.keyboard.press('Tab')
      const inlineClose = page.getByTestId('dialog-pop-inline-close')
      await expect(inlineClose).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(dialogFirst).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('supports modal=false, role="alertdialog", and themed dialog with Axe clean', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      // 1. modal=false leaves background active, renders no overlay, locks no scroll.
      const nonModalTrigger = page.getByTestId('dialog-nonmodal-trigger')
      const nonModalContent = page.getByTestId('dialog-nonmodal-content')
      const nonModalOverlay = page.getByTestId('dialog-nonmodal-overlay')
      const outsideTarget = page.getByTestId('dialog-outside-target')

      await nonModalTrigger.scrollIntoViewIfNeeded()
      await nonModalTrigger.click()
      await expect(nonModalContent).toBeVisible()
      await expect(nonModalOverlay).toHaveCount(0)
      expect(
        await nonModalContent.evaluate((el) => el.hasAttribute('aria-modal')),
      ).toBe(false)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect(
        await page.evaluate(
          () => document.getElementById('app')?.hasAttribute('inert') ?? false,
        ),
      ).toBe(false)

      await outsideTarget.click()
      await expect(nonModalContent).toHaveCount(0)
      await expect(outsideTarget).toBeFocused()

      // 2. Themed modal dialog opens, applies elevation-4 styles, and passes Axe.
      const themedTrigger = page.getByTestId('dialog-themed-trigger')
      const themedOverlay = page.getByTestId('dialog-themed-overlay')
      const themedContent = page.getByTestId('dialog-themed-content')

      await themedTrigger.scrollIntoViewIfNeeded()
      await themedTrigger.click()
      await expect(themedOverlay).toBeVisible()
      await expect(themedContent).toBeVisible()
      await expect(themedContent).toHaveAttribute('data-themed', '')
      const themedAxe = await new AxeBuilder({ page }).analyze()
      expect(themedAxe.violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(themedContent).toHaveCount(0)
      await expect(themedTrigger).toBeFocused()

      // 3. Themed alertdialog ignores overlay click by default and closes on Escape/action.
      const alertTrigger = page.getByTestId('dialog-alert-trigger')
      const alertOverlay = page.getByTestId('dialog-alert-overlay')
      const alertContent = page.getByTestId('dialog-alert-content')

      await alertTrigger.scrollIntoViewIfNeeded()
      await alertTrigger.click()
      await expect(alertContent).toBeVisible()
      await expect(alertContent).toHaveAttribute('role', 'alertdialog')

      const alertAxe = await new AxeBuilder({ page }).analyze()
      expect(alertAxe.violations).toEqual([])

      await alertOverlay.click({ position: { x: 8, y: 8 } })
      await expect(alertContent).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(alertContent).toHaveCount(0)
      await expect(alertTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
